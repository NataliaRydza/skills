import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProposals, renderMarkdown, FIXES} from './propose.mjs';

const lint = [
  {severity: 'info', code: 'na-literal', file: 'jigs/a.jigx', line: 4, message: "x (core rule 1.4)."},
  {severity: 'error', code: 'destructive-swipe-without-confirm', file: 'jigs/b.jigx', line: 9, message: 'x (core rule 2.8).'},
  {severity: 'warning', code: 'sync-state-negative', file: 'jigs/c.jigx', line: 2, message: 'x (core rule 1.7).'},
  {severity: 'warning', code: 'sync-state-negative', file: 'jigs/d.jigx', line: 7, message: 'x (core rule 1.7).'},
];

test('groups findings by kind, orders by severity, numbers P1..Pn', () => {
  const p = buildProposals(lint, null);
  assert.deepEqual(p.map((x) => [x.id, x.severity, x.source]), [
    ['P1', 'High', 'ux-lint:destructive-swipe-without-confirm'],
    ['P2', 'Medium', 'ux-lint:sync-state-negative'],
    ['P3', 'Low', 'ux-lint:na-literal'],
  ]);
  assert.deepEqual(p[1].places, ['jigs/c.jigx:2', 'jigs/d.jigx:7']);
  assert.equal(p[1].rule, 'core rule 1.7');
});

test('icon migration is proposed; icons from data are left to icon-migration', () => {
  const icons = {status: 'needs-migration', counts: {legacyNames: 1, unknownNames: 1, fromData: 1, dynamic: 0},
    legacy: [{name: 'calendar-3', suggested: 'calendar'}], unknown: [{name: 'coffee-mug'}],
    fromData: [{source: 'default/menu ($.icon, Dynamic Data)', file: 'datasources/m.jigx', line: 3}], dynamic: []};
  const p = buildProposals([{severity: 'info', code: 'icon-from-data', file: 'jigs/a.jigx', line: 1, message: 'x'}], icons);
  assert.equal(p.length, 1);
  assert.match(p[0].title, /Move 2 icon names/);
  assert.deepEqual(p[0].places, ['calendar-3 → calendar', 'coffee-mug → (needs a choice)']);
  assert.match(p[0].why, /red question mark/);
});

test('messages are grouped by text, SDK places name their source, one error makes it High', () => {
  const f = [
    {severity: 'warning', code: 'generic-copy', file: 'build/app/functions/a.jigx', line: 5, source: 'src/functions/a.ts', excerpt: 'Something Went Wrong', message: 'x'},
    {severity: 'warning', code: 'generic-copy', file: 'build/app/functions/b.jigx', line: 6, excerpt: 'Something Went Wrong', message: 'x'},
    {severity: 'warning', code: 'generic-copy', file: 'build/app/functions/c.jigx', line: 7, excerpt: 'Oops', message: 'x'},
  ];
  const [p] = buildProposals(f, null);
  assert.deepEqual(p.messages, [{text: 'Something Went Wrong', count: 2}, {text: 'Oops', count: 1}]);
  assert.equal(p.places[0], 'build/app/functions/a.jigx:5 (from src/functions/a.ts)');
  const md = renderMarkdown({solution: 'TT', date: '2026-11-23', proposals: [{id: 'P1', ...p}]});
  assert.match(md, /- \*\*Messages found \(2\):\*\*\n  - "Something Went Wrong" \(2 places\)\n  - "Oops" \(1 place\)\n- \*\*Where it happens \(3\)/);
  assert.match(md, /  - build\/app\/functions\/a.jigx:5 \(from src\/functions\/a.ts\) · not checked yet/);
  assert.match(md, /## Not proposed here/);
  const mixed = buildProposals([{severity: 'warning', code: 'discard-alert-off', file: 'a', line: 1, message: 'x'}, {severity: 'error', code: 'discard-alert-off', file: 'b', line: 1, message: 'x'}], null);
  assert.equal(mixed[0].severity, 'High');
});

test('places the lint cannot settle are marked needs verification', () => {
  const [p] = buildProposals([{severity: 'info', code: 'too-many-actions', file: 'jigs/r.jigx', line: 9, message: 'x (core rule 2.12).', verify: 'which states show more than 2'}], null);
  const md = renderMarkdown({solution: 'R', date: '2026-11-24', proposals: [p]});
  assert.match(md, /  - jigs\/r.jigx:9 · needs verification: which states show more than 2/);
  assert.match(md, /\*\*needs verification\*\*/);
});

test('markdown has checkboxes, a summary table and says nothing changed yet', () => {
  const md = renderMarkdown({solution: 'Demo', date: '2026-11-11', proposals: buildProposals(lint, null)});
  assert.match(md, /Nothing has been changed yet/);
  assert.match(md, /## P1 \[High\] Ask before a swipe deletes something\n\n- \[ \] \*\*Approve\*\*\n- \*\*What's wrong:\*\* .+\n- \*\*Why change it:\*\* .+\n- \*\*Proposed fix:\*\* /);
  assert.match(md, /\| P2 \| Medium \| Don't show "waiting to sync" in red \| 2 \| S \|/);
  assert.match(md, /- \*\*Where it happens \(2\):\*\*\n  - jigs\/c.jigx:2 · not checked yet/);
  assert.match(md, /## Manual findings/);
});

test('every lint code has a proposed fix', async () => {
  const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('./ux-lint.mjs', import.meta.url), 'utf8'));
  const codes = [...src.matchAll(/add\('([a-z-]+)'/g)].map((m) => m[1]);
  for (const code of new Set(codes)) {
    assert.ok(FIXES[code], `missing fix text for ${code}`);
    for (const key of ['title', 'problem', 'why', 'fix']) assert.ok(FIXES[code][key], `${code} has no ${key}`);
  }
});
