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

test('icon migration and data icons become proposals', () => {
  const icons = {status: 'needs-migration', counts: {legacyNames: 1, unknownNames: 1, fromData: 1, dynamic: 0},
    legacy: [{name: 'calendar-3', suggested: 'calendar'}], unknown: [{name: 'coffee-mug'}],
    fromData: [{source: 'default/menu ($.icon, Dynamic Data)', file: 'datasources/m.jigx', line: 3}], dynamic: []};
  const p = buildProposals([], icons);
  assert.equal(p.length, 2);
  assert.match(p[0].title, /Migrate 2 icon names/);
  assert.deepEqual(p[0].places, ['calendar-3 → calendar', 'coffee-mug → (needs a choice)']);
  assert.match(p[1].fix, /Owner action/);
});

test('markdown has checkboxes, a summary table and says nothing changed yet', () => {
  const md = renderMarkdown({solution: 'Demo', date: '2026-11-11', proposals: buildProposals(lint, null)});
  assert.match(md, /Nothing has been changed yet/);
  assert.match(md, /## P1 \[High\] Confirm destructive swipe actions\n\n- \[ \] \*\*Approve\*\*/);
  assert.match(md, /\| P2 \| Medium \| Stop colouring "waiting to sync" as an error \| 2 \| S \|/);
  assert.match(md, /## Manual findings/);
});

test('every lint code has a proposed fix', async () => {
  const src = await import('node:fs').then((fs) => fs.readFileSync(new URL('./ux-lint.mjs', import.meta.url), 'utf8'));
  const codes = [...src.matchAll(/add\('([a-z-]+)'/g)].map((m) => m[1]);
  for (const code of new Set(codes)) assert.ok(FIXES[code], `missing fix text for ${code}`);
});
