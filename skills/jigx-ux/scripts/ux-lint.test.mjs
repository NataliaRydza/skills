import test from 'node:test';
import assert from 'node:assert/strict';
import {lintSource, solutionContext, hasUnconditionalConfirm, flowFiles, scopeArgs} from './ux-lint.mjs';

const codes = (text) => lintSource(text).map((f) => f.code);

test('screen without title or header is reported', () => {
  assert.deepEqual(codes('type: jig.default\nchildren: []\n'), ['missing-title', 'missing-header']);
  assert.deepEqual(codes('title: Photos\ntype: jig.default\nheader:\n  type: component.jig-header\n'), []);
  assert.deepEqual(codes('title: Notes\ntype: jig.full-screen\n'), []);
});

test('destructive swipe without confirm, wrong icon and colour', () => {
  const bad = [
    'swipeable:',
    '  left:',
    '    - label: Delete',
    '      icon: pencil',
    '      color: primary',
    '      onPress:',
    '        type: action.execute-entity',
    '    - label: Copy',
    '      icon: copy',
  ].join('\n');
  assert.deepEqual(codes(bad), ['destructive-swipe-without-confirm', 'destructive-icon-mismatch', 'destructive-color']);
  const good = [
    'swipeable:',
    '  left:',
    '    - label: Delete',
    '      icon: trash',
    '      color: negative',
    '      onPress:',
    '        type: action.confirm',
  ].join('\n');
  assert.deepEqual(codes(good), []);
  const shared = '- label: Delete\n  icon: trash\n  color: negative\n  onPress:\n    type: action.execute-action\n';
  // A shared action that can't be found, or doesn't always ask, is rated like a missing confirm.
  assert.deepEqual(codes(shared), ['destructive-swipe-without-confirm']);
});

test('sync state coloured negative is flagged, failures are not', () => {
  const pending = "tags:\n  - text: |\n      =@ctx.current.item.loc = 'local' ? 'Local' : 'Uploaded'\n    color: |\n      =@ctx.current.item.loc = 'local' ? 'negative' : 'positive'\n";
  assert.deepEqual(codes(pending), ['sync-state-negative']);
  assert.deepEqual(codes('tags:\n  - text: Sync failed\n    color: negative\n'), []);
});

test('copy, discard and formatting heuristics', () => {
  assert.deepEqual(codes('      title: Oops! Looks like you are offline'), ['generic-copy']);
  const form = (field) => `- type: component.form\n  options:\n    isDiscardChangesAlertEnabled: false\n    children:\n      - type: component.${field}\n`;
  assert.deepEqual(codes(form('text-field')), ['discard-alert-off']);
  assert.deepEqual(codes(form('dropdown')), [], 'filter/picker forms lose no typed input');
  assert.deepEqual(codes('    isDiscardChangesAlertEnabled: =@ctx.components.f.state.isDirty'), []);
  assert.deepEqual(codes('          format: HH:mm'), ['hardcoded-date-format']);
  assert.deepEqual(codes("      subtitle: ='N/A'"), ['na-literal']);
  assert.deepEqual(codes('      confirm: Yes'), ['generic-label']);
  assert.deepEqual(codes('      # title: Oops'), []);
});

test('data icons are reported once per file, errors in toasts are noted', () => {
  assert.deepEqual(codes('icon: =@ctx.current.item.icon\nicon: =@ctx.current.item.other\n'), ['icon-from-data']);
  const toast = '- type: action.show-alert\n  options:\n    presentAs: toast\n    style:\n      isNegative: true\n';
  assert.deepEqual(codes(toast), ['error-in-toast']);
});

test('severity: only missing confirm on destructive swipe is an error', () => {
  const f = lintSource('- label: Remove\n  icon: trash\n  color: negative\n');
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, 'error');
  assert.equal(f[0].line, 1);
});

test('more than two bottom actions are reported with their states', () => {
  const jig = [
    'title: Photos',
    'type: jig.default',
    'header:',
    '  type: component.jig-header',
    'actions:',
    '  - numberOfVisibleActions: 2',
    '    children:',
    '      - type: action.go-to',
    '        options:',
    '          title: Add',
    '          style:',
    '            isPrimary: true',
    '      - type: action.go-to',
    '        options:',
    '          title: View budget',
    '      - type: action.action-list',
    '        options:',
    '          isHidden: =$not($hasErrors)',
    "          title: =@ctx.system.isOnline ? 'Retry uploads' : 'Retry when online'",
    '          actions:',
    '            - type: action.go-to',
    '              options:',
    '                title: Nested, not a button',
  ].join('\n');
  const [f] = lintSource(jig).filter((x) => x.code === 'too-many-actions');
  assert.ok(f, 'expected too-many-actions');
  assert.match(f.message, /3 bottom actions: Add, View budget, "Retry uploads"\/\.\.\. \(some states\)\. 2 always shown, so up to 3 show at once\. Past 2, the rest go behind the three-dots menu/);
  assert.equal(f.severity, 'warning');
  const two = jig.split('\n').slice(0, 15).join('\n');
  assert.deepEqual(lintSource(two).filter((x) => x.code === 'too-many-actions'), []);
});

test('bottom actions that swap by state are counted by what can show together', () => {
  const btn = (title, when) => [`      - type: action.go-to`, `        when: ${when}`, `        options:`, `          title: ${title}`];
  const jig = (buttons) => ['title: Return', 'type: jig.default', 'header:', '  type: component.jig-header', 'actions:', '  - numberOfVisibleActions: 2', '    children:', ...buttons.flat()].join('\n');
  const steps = [btn('Previous', '=$isPrep and $step>1'), btn('Continue', '=$isPrep and $step=1'), btn('Review', '=$isPrep and $step=2'), btn('Done', '=$step=3')];
  assert.deepEqual(lintSource(jig(steps)).filter((x) => x.code === 'too-many-actions'), [], 'at most 2 per step');
  const data = [btn('Retry', '=@ctx.datasources.w.state=\'failed\''), btn('Receive', '=$canReceive or $busy'), btn('Complete', '=$canComplete')];
  const [f] = lintSource(jig(data)).filter((x) => x.code === 'too-many-actions');
  assert.equal(f.severity, 'info');
  assert.match(f.message, /can't rule out more than 2 at once/);
  assert.match(f.verify, /which states/);
});

test('discard: explicit-save forms warn, autosave forms ask to verify', () => {
  const form = (onChange) => ['- type: component.form', '  options:', '    isDiscardChangesAlertEnabled: false', '    children:', '      - type: component.number-field', '        instanceId: qty', '        options:', '          label: Quantity', ...(onChange ? ['          onChange:', '            type: action.execute-action'] : [])].join('\n');
  const [explicit] = lintSource(form(false));
  assert.equal(explicit.severity, 'warning');
  assert.match(explicit.message, /saves only with a button/);
  const [auto] = lintSource(form(true));
  assert.equal(auto.severity, 'info');
  assert.ok(auto.verify);
});

test('N/A as an answer option or a stored answer is not a missing value', () => {
  assert.deepEqual(codes('    data: =[{"value":"Yes"},{"value":"No"},{"value":"N/A"}]'), []);
  assert.deepEqual(codes("    when: =@ctx.current.item.answer != 'N/A'"), []);
  assert.deepEqual(codes("    value: =$exists(x) ? x : 'N/A'"), ['na-literal']);
});

test('errors: server errors are flagged, app-set errors are marked to verify', () => {
  const [server] = lintSource('    description: =@ctx.datasources.queue.error');
  assert.equal(server.code, 'raw-error-text');
  assert.equal(server.verify, undefined);
  const [app] = lintSource('    title: =@ctx.jig.state.correction.error');
  assert.match(app.verify, /plain words written in the app/);
});

test('scope: --only folders and --flow follow screens and shared actions', () => {
  const files = [
    {file: 'jigs/Rental/start.jigx', text: 'linkTo: edit\naction: act-save\n'},
    {file: 'jigs/Rental/edit.jigx', text: 'title: Edit\n'},
    {file: 'actions/act-save.jigx', text: 'type: action.action-list\n'},
    {file: 'jigs/Other/x.jigx', text: 'linkTo: start\n'},
  ];
  assert.deepEqual([...flowFiles(files, 'start')].sort(), ['actions/act-save.jigx', 'jigs/Rental/edit.jigx', 'jigs/Rental/start.jigx']);
  assert.throws(() => flowFiles(files, 'nope'), /no screen or action named/);
  assert.deepEqual(scopeArgs(['sol', '--only', 'jigs/A,jigs/B', '--flow', 'start', '--text']), {scope: {only: ['jigs/A', 'jigs/B'], flow: 'start'}, rest: ['sol', '--text']});
});

test('default numbers that typing appends to are reported', () => {
  const field = (extra) => ['- type: component.number-field', '  instanceId: qty', '  options:', '    label: Quantity', '    initialValue: 1', ...extra].join('\n');
  assert.deepEqual(codes(field([])), ['prefilled-number-default']);
  assert.deepEqual(codes(field(['    isTextClearedOnFocus: true'])), []);
  assert.deepEqual(codes(['- type: component.number-field', '  options:', '    initialValue: =@ctx.current.item.qty'].join('\n')), []);
});

test('custom layouts are flagged once per file, and visible strings are collected', async () => {
  const src = '- type: component.custom-component\n  options:\n    title: Upload local changes\n- type: component.custom-component\n';
  assert.deepEqual(codes(src), ['custom-layout']);
  const {collectStrings} = await import('./ux-lint.mjs');
  const texts = collectStrings('title: Model equiment\nlabel: =@ctx.x\nlinkTo: add-appointment-photos\nsubtitle: "1 files"\n').map((s) => s.text);
  assert.deepEqual(texts, ['Model equiment', '1 files']);
});

test('delete swipes follow shared actions; a conditional confirm does not count', () => {
  const swipe = '- label: Delete\n  icon: trash\n  color: negative\n  onPress:\n    type: action.execute-action\n    options:\n      action: act-delete-line\n';
  const asks = 'action:\n  type: action.action-list\n  options:\n    actions:\n      - type: action.confirm\n        options:\n          isConfirmedAutomatically: false\n';
  const sometimes = 'action:\n  type: action.action-list\n  options:\n    actions:\n      - type: action.confirm\n        when: =@ctx.action.parameters.blocked = true\n';
  const ctx = (text) => solutionContext([{file: 'actions/act-delete-line.jigx', text}]);
  assert.deepEqual(lintSource(swipe, 'jigs/a.jigx', ctx(asks)).map((f) => f.code), []);
  const f = lintSource(swipe, 'jigs/a.jigx', ctx(sometimes));
  assert.equal(f[0].code, 'destructive-swipe-without-confirm');
  assert.equal(f[0].severity, 'error');
  assert.match(f[0].message, /none of them always asks/);
  assert.equal(hasUnconditionalConfirm(sometimes), false);
  const server = "- label: Delete\n  icon: trash\n  color: negative\n  onPress:\n    type: action.action-list\n    options:\n      actions:\n        - type: action.call-function\n          options:\n            function: rest-delete-issue\n        - type: action.execute-action\n          options:\n            action: action-logout\n";
  const g = lintSource(server, 'jigs/b.jigx', solutionContext([{file: 'actions/action-logout.jigx', text: 'action:\n  type: action.reset-state\n'}]));
  assert.match(g[0].message, /deletes on the server/);
});

test('error used only in a condition is not raw error text', () => {
  assert.deepEqual(codes('      text: =@ctx.current.item.error ? "Error" : ""'), []);
  assert.deepEqual(codes('      text: =@ctx.current.item.errorMessage'), ['raw-error-text']);
});

test('jigs only opened as a modal need no header; generic copy keeps the message', () => {
  const caller = { file: 'jigs/list.jigx', text: 'onPress:\n  type: action.go-to\n  options:\n    linkTo: edit-drawer\n    isModal: true\n' };
  const ctx = solutionContext([caller]);
  assert.deepEqual(lintSource('title: Edit\ntype: jig.default\n', 'jigs/edit-drawer.jigx', ctx).map((f) => f.code), []);
  assert.deepEqual(lintSource('title: Edit\ntype: jig.default\n', 'jigs/other.jigx', ctx).map((f) => f.code), ['missing-header']);
  const [copy] = lintSource("        description: 'Something Went Wrong. Please email dev@example.com'");
  assert.equal(copy.excerpt, 'Something Went Wrong. Please email dev@example.com');
  const [withDesc] = lintSource('  - when: =x\n    title: Something Went Wrong\n    description: |\n      "Please screenshot and email to dev@example.com"\n');
  assert.equal(withDesc.excerpt, 'Something Went Wrong / Please screenshot and email to dev@example.com');
});

test('a Core SDK project is linted on its build output, mapped back to src', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const {lintProject, resolveSolution} = await import('./ux-lint.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jigx-ux-sdk-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({dependencies: {'@jigx/sdk': '1.0.0'}}));
  fs.mkdirSync(path.join(dir, 'src/jigs'), {recursive: true});
  fs.writeFileSync(path.join(dir, 'src/jigs/jig-timeclock.ts'), 'export default {}');
  assert.throws(() => resolveSolution(dir), /build it first|Build it first/);
  fs.mkdirSync(path.join(dir, 'build/app/jigs'), {recursive: true});
  fs.writeFileSync(path.join(dir, 'build/app/index.jigx'), 'name: tt\n');
  fs.writeFileSync(path.join(dir, 'build/app/jigs/jig-timeclock.jigx'), 'type: jig.default\n');
  const {target, findings} = lintProject(dir);
  assert.equal(target.kind, 'sdk');
  assert.equal(findings[0].file, path.join('build', 'app', 'jigs', 'jig-timeclock.jigx'));
  assert.equal(findings[0].source, path.join('src', 'jigs', 'jig-timeclock.ts'));
  fs.rmSync(dir, {recursive: true, force: true});
});

test('screens shown in a bottom sheet count as modal', () => {
  const host = {file: 'jigs/host.jigx', text: 'title: Host\nbottomSheet:\n  children:\n    - jigId: qty-editor\n      inputs:\n        id: =1\n'};
  const {modalOnly} = solutionContext([host]);
  assert.ok(modalOnly.has('qty-editor'));
});
