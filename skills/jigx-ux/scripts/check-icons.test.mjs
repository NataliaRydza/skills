import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {findIconSkill, summarise, checkNames, isIconPlace} from './check-icons.mjs';

// A stub icon-migration skill: same layout and API as the real one, tiny data.
function stubSkill(root) {
  const dir = path.join(root, 'skills/icon-migration');
  fs.mkdirSync(path.join(dir, 'scripts'), {recursive: true});
  fs.mkdirSync(path.join(dir, 'data'), {recursive: true});
  fs.writeFileSync(path.join(dir, 'data/tabler-outline.json'), '{}');
  fs.writeFileSync(path.join(dir, 'scripts/scanner.mjs'), 'export function scanSolution(){return {}}');
  fs.writeFileSync(path.join(dir, 'scripts/lib.mjs'), 'export function loadData(){return {}}');
  return dir;
}

const data = {
  tabler: {'chevron-right': [], 'arrow-right': [], trash: [], star: [], 'circle-plus': []},
  mapping: {'add-circle': 'circle-plus', 'arrow-right': 'chevron-right'},
  streamline: {'add-circle': [], 'button-refresh-arrows': []},
  keep: new Set(['us', 'loading-data']),
};
const lib = {isValidTabler: (d, n) => Object.hasOwn(d.tabler, n) && !n.endsWith('-filled')};

test('finds the skill from an explicit path or returns null with install steps needed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
  const dir = stubSkill(root);
  assert.equal(findIconSkill({explicit: root, env: '', home: root, cwd: root}), dir);
  assert.equal(findIconSkill({explicit: dir, env: '', home: root, cwd: root}), dir);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-none-'));
  assert.equal(findIconSkill({env: '', home: empty, cwd: empty}), null);
});

test('prefers the newest cached plugin version', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-home-'));
  const cache = path.join(home, '.claude/plugins/cache/jigx-icon-migration/icon-migration');
  stubSkill(path.join(cache, '1.9.0'));
  const newest = stubSkill(path.join(cache, '1.10.0'));
  assert.equal(findIconSkill({env: '', home, cwd: home}), newest);
});

test('checks single names: current, legacy, filled, kept, shared, unknown', () => {
  const byName = Object.fromEntries(checkNames(['trash', 'add-circle', 'star-filled', 'us', 'arrow-right', 'made-up', 'button-refresh-arrows'], data, lib).map((r) => [r.name, r]));
  assert.equal(byName.trash.status, 'ok');
  assert.deepEqual([byName['add-circle'].status, byName['add-circle'].suggestion], ['legacy', 'circle-plus']);
  assert.deepEqual([byName['star-filled'].status, byName['star-filled'].suggestion], ['invalid', 'star']);
  assert.equal(byName.us.status, 'ok');
  assert.equal(byName['arrow-right'].status, 'ok');
  assert.match(byName['arrow-right'].note, /chevron-right/);
  assert.equal(byName['made-up'].status, 'invalid');
  assert.equal(byName['button-refresh-arrows'].status, 'legacy');
});

test('unknown names count only on icon keys in published folders', () => {
  assert.equal(isIconPlace('coffee-mug', {file: 'jigs/home.jigx', context: 'icon: coffee-mug'}), true);
  assert.equal(isIconPlace('coffee-mug', {file: 'jigs/a.jigx', context: '{"id": "x", "icon": "coffee-mug"}'}), true);
  assert.equal(isIconPlace('items', {file: 'jigs/a.jigx', context: '{"id": "items", "icon": "forklift"}'}), false);
  assert.equal(isIconPlace('missing-id', {file: 'actions/a.jigx', context: 'id: missing-id'}), false);
  assert.equal(isIconPlace('x-icon', {file: 'QA tests/e.json', context: '"icon": "x-icon"'}), false);
  assert.equal(isIconPlace('1', {file: 'jigs/a.jigx', context: 'icon: 1'}), false);
});

test('summary status: needs migration, in progress, ok', () => {
  const sol = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-sol-'));
  const base = {solution: 's', tablerVersion: '3.49.0', unchanged: {}, maybe: [], dynamic: [], fromData: []};
  const legacy = summarise({...base, mapped: {'add-circle': {new: 'circle-plus', where: [{file: 'jigs/a.jigx', line: 3}]}}, pending: {}}, sol);
  assert.equal(legacy.status, 'needs-migration');
  assert.deepEqual(legacy.legacy[0], {name: 'add-circle', suggested: 'circle-plus', uses: 1, where: ['jigs/a.jigx:3']});
  const noisy = summarise({...base, mapped: {}, pending: {items: {where: [{file: 'jigs/a.jigx', line: 1, context: 'id: items'}]}}}, sol);
  assert.equal(noisy.status, 'ok');
  assert.equal(noisy.counts.ignoredNonIconStrings, 1);
  fs.mkdirSync(path.join(sol, '.icon-migration'));
  assert.equal(summarise({...base, mapped: {}, pending: {}}, sol).status, 'migration-in-progress');
});
