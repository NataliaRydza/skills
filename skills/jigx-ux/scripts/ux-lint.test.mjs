import test from 'node:test';
import assert from 'node:assert/strict';
import {lintSource} from './ux-lint.mjs';

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
  assert.deepEqual(codes(shared), ['destructive-swipe-confirm-unverified']);
});

test('sync state coloured negative is flagged, failures are not', () => {
  const pending = "tags:\n  - text: |\n      =@ctx.current.item.loc = 'local' ? 'Local' : 'Uploaded'\n    color: |\n      =@ctx.current.item.loc = 'local' ? 'negative' : 'positive'\n";
  assert.deepEqual(codes(pending), ['sync-state-negative']);
  assert.deepEqual(codes('tags:\n  - text: Sync failed\n    color: negative\n'), []);
});

test('copy, discard and formatting heuristics', () => {
  assert.deepEqual(codes('      title: Oops! Looks like you are offline'), ['generic-copy']);
  assert.deepEqual(codes('    isDiscardChangesAlertEnabled: false'), ['discard-alert-off']);
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
  assert.match(f.message, /3 bottom actions: Add, View budget, "Retry uploads"\/\.\.\. \(some states\)\. 2 always shown\. 1 of them sit behind the three-dots menu/);
  const two = jig.split('\n').slice(0, 15).join('\n');
  assert.deepEqual(lintSource(two).filter((x) => x.code === 'too-many-actions'), []);
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
