#!/usr/bin/env node
// Read-only check that a Jigx solution uses current Tabler outline icon names.
// It reuses the installed icon-migration skill (scanner + bundled Tabler/Streamline data)
// instead of copying that data here. Nothing is written to the solution.
//
// Usage:
//   node check-icons.mjs <solution> [--json] [--icon-skill <path>]
//   node check-icons.mjs --name <icon> [<icon> ...] [--icon-skill <path>]
// Exit codes: 0 clean, 1 needs migration / invalid names, 2 failure, 3 icon-migration skill not found.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const INSTALL_STEPS = [
  'Install the icon-migration skill once (needs Node.js 18+, access to the private jigx-com/icon-migration repo, and `gh auth login`):',
  '  Claude Code:  /plugin marketplace add jigx-com/icon-migration',
  '                /plugin install icon-migration@jigx-icon-migration',
  '  Codex/others: npx skills add jigx-com/icon-migration -g -a codex',
  'Then run this check again, or point it at the skill with --icon-skill <path> or JIGX_ICON_MIGRATION_SKILL.',
];

export const MIGRATION_STEPS = [
  'Commit or back up the solution first (the migration can also be reverted).',
  'In the solution folder run /icon-migration (Claude Code), or ask your agent to "migrate the icons in this solution". One solution at a time.',
  'The agent renames the icons and opens a review page. Change any pick you do not like, press "Copy changes for the agent" and paste the result back into the chat.',
  'Icons that come from data (Dynamic Data tables, REST, external sources) must be updated at that source; the migration lists them but cannot change them.',
  'When you are happy, delete the .icon-migration folder (never publish it), publish the solution and check the icons in the app. A red question mark is a name Tabler does not have.',
];

const isSkillDir = (dir) =>
  !!dir && ['scripts/scanner.mjs', 'scripts/lib.mjs', 'data/tabler-outline.json'].every((f) => fs.existsSync(path.join(dir, f)));

const versionKey = (v) => v.split('.').map((n) => String(Number(n) || 0).padStart(6, '0')).join('.');

export function candidateSkillDirs(home = os.homedir(), cwd = process.cwd()) {
  const dirs = [];
  const cache = path.join(home, '.claude/plugins/cache/jigx-icon-migration/icon-migration');
  if (fs.existsSync(cache)) {
    const versions = fs.readdirSync(cache).filter((v) => /^\d/.test(v)).sort((a, b) => versionKey(b).localeCompare(versionKey(a)));
    for (const v of versions) dirs.push(path.join(cache, v, 'skills/icon-migration'));
  }
  dirs.push(
    path.join(home, '.claude/plugins/marketplaces/jigx-icon-migration/skills/icon-migration'),
    path.join(home, '.claude/skills/icon-migration'),
    path.join(home, '.codex/skills/icon-migration'),
    path.join(home, '.agents/skills/icon-migration'),
    path.join(cwd, '.claude/skills/icon-migration'),
    path.join(cwd, '.agents/skills/icon-migration'),
  );
  return dirs;
}

export function findIconSkill({explicit, env = process.env.JIGX_ICON_MIGRATION_SKILL, home, cwd} = {}) {
  for (const dir of [explicit, env].filter(Boolean)) {
    if (isSkillDir(dir)) return path.resolve(dir);
    if (isSkillDir(path.join(dir, 'skills/icon-migration'))) return path.resolve(dir, 'skills/icon-migration');
  }
  return candidateSkillDirs(home, cwd).find(isSkillDir) ?? null;
}

export async function loadTool(skillDir) {
  const lib = await import(pathToFileURL(path.join(skillDir, 'scripts/lib.mjs')).href);
  const scanner = await import(pathToFileURL(path.join(skillDir, 'scripts/scanner.mjs')).href);
  return {lib, scanner, data: lib.loadData()};
}

const uses = (bucket) => Object.values(bucket).reduce((n, item) => n + item.where.length, 0);

// Folders that hold evidence, docs or tooling rather than published solution files.
export const NON_SOLUTION_DIRS = /^(QA tests|qa-tests|tests?|test-evidence|evidence|docs|dev-tools|artifacts|tmp|node_modules)\//i;
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

// The scanner is generous: it can treat any value of a property that an icon expression
// reads (for example `id`) as an icon. For unknown names keep only places where the name
// sits on an icon key, in published solution folders.
export function isIconPlace(name, where) {
  if (NON_SOLUTION_DIRS.test(where.file ?? '')) return false;
  if (/^\d+$/.test(name) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(name)) return false;
  const context = where.context ?? where.text ?? '';
  return new RegExp(`icon[\\w-]*["']?\\s*:[^,}]*\\b${escapeRe(name)}\\b`, 'i').test(context);
}

// Summarise the scanner's result into what a UX review needs.
export function summarise(result, solutionDir) {
  const legacy = Object.entries(result.mapped).map(([name, item]) => ({name, suggested: item.new, uses: item.where.length,
    where: item.where.map((w) => `${w.file}:${w.line}`)}));
  let ignored = 0;
  const unknown = Object.entries(result.pending).flatMap(([name, item]) => {
    const places = item.where.filter((w) => isIconPlace(name, w));
    ignored += item.where.length - places.length;
    return places.length ? [{name, uses: places.length, where: places.map((w) => `${w.file}:${w.line}`)}] : [];
  });
  const unknownUses = unknown.reduce((n, u) => n + u.uses, 0);
  const inProgress = fs.existsSync(path.join(solutionDir, '.icon-migration'));
  const needsMigration = legacy.length > 0 || unknown.length > 0;
  return {
    solution: result.solution,
    tablerVersion: result.tablerVersion,
    status: needsMigration ? 'needs-migration' : inProgress ? 'migration-in-progress' : 'ok',
    counts: {legacyNames: legacy.length, legacyUses: uses(result.mapped), unknownNames: unknown.length, unknownUses,
      ignoredNonIconStrings: ignored,
      currentNames: Object.keys(result.unchanged).length, maybe: result.maybe.length, dynamic: result.dynamic.length, fromData: result.fromData.length},
    legacy, unknown,
    fromData: result.fromData,
    dynamic: result.dynamic,
    migrationFolderPresent: inProgress,
  };
}

export function checkNames(names, data, lib) {
  return names.map((name) => {
    if (data.keep.has(name)) return {name, status: 'ok', note: 'kept as is (flag, marker or placeholder animation)'};
    if (name.endsWith('-filled')) return {name, status: 'invalid', note: 'filled icons are not shipped; use the outline name', suggestion: name.replace(/-filled$/, '')};
    if (lib.isValidTabler(data, name)) {
      if (data.mapping[name] && data.mapping[name] !== name)
        return {name, status: 'ok', note: `shared name: Tabler draws its own picture; old solutions meant ${data.mapping[name]} (e.g. use chevron-right for navigation)`};
      return {name, status: 'ok'};
    }
    if (data.mapping[name]) return {name, status: 'legacy', suggestion: data.mapping[name], note: 'old Streamline name'};
    if (data.streamline[name]) return {name, status: 'legacy', note: 'old Streamline name with no reference pick; choose a Tabler name'};
    return {name, status: 'invalid', note: 'not a Tabler outline icon; it will show a red question mark'};
  });
}

function printReport(s) {
  console.log(`Icons in ${s.solution} (Tabler ${s.tablerVersion} outline)`);
  if (s.status === 'ok') {
    console.log('OK: every icon name in the solution files is a current Tabler outline name.');
  } else if (s.status === 'migration-in-progress') {
    console.log('Icon names are current, but a .icon-migration folder exists. Finish the review, then delete it before publishing.');
  } else {
    console.log(`Needs migration: ${s.counts.legacyNames} old names (${s.counts.legacyUses} uses), ${s.counts.unknownNames} unknown names (${s.counts.unknownUses} uses).`);
    for (const l of s.legacy.slice(0, 15)) console.log(`  ${l.name} -> ${l.suggested}  (${l.uses}x, e.g. ${l.where[0]})`);
    if (s.legacy.length > 15) console.log(`  ... ${s.legacy.length - 15} more`);
    for (const u of s.unknown.slice(0, 15)) console.log(`  ${u.name} -> needs a choice  (${u.uses}x, e.g. ${u.where[0]})`);
    if (s.unknown.length > 15) console.log(`  ... ${s.unknown.length - 15} more`);
  }
  if (s.counts.ignoredNonIconStrings)
    console.log(`(${s.counts.ignoredNonIconStrings} strings outside icon keys or published folders were ignored.)`);
  if (s.counts.fromData || s.counts.dynamic)
    console.log(`Icons from data: ${s.counts.fromData} table reads, ${s.counts.dynamic} computed values. Their values must be Tabler names at the source, and registered in assets/icons.jigx.`);
  if (s.status === 'needs-migration') {
    console.log('\nNext steps:');
    MIGRATION_STEPS.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const take = (flag) => { const i = argv.indexOf(flag); if (i < 0) return undefined; const v = argv[i + 1]; argv.splice(i, 2); return v; };
  const explicit = take('--icon-skill');
  const asJson = argv.includes('--json');
  const nameMode = argv.includes('--name');
  const positional = argv.filter((a) => !a.startsWith('--'));
  try {
    const skillDir = findIconSkill({explicit});
    if (!skillDir) {
      const out = {status: 'tool-missing', installSteps: INSTALL_STEPS, migrationSteps: MIGRATION_STEPS};
      if (asJson) console.log(JSON.stringify(out, null, 2));
      else { console.log('The icon-migration skill is not installed, so icon names cannot be checked.'); INSTALL_STEPS.forEach((s) => console.log(s)); }
      process.exit(3);
    }
    const {lib, scanner, data} = await loadTool(skillDir);
    if (nameMode) {
      const results = checkNames(positional, data, lib);
      if (asJson) console.log(JSON.stringify(results, null, 2));
      else for (const r of results) console.log(`${r.status.padEnd(7)} ${r.name}${r.suggestion ? ` -> ${r.suggestion}` : ''}${r.note ? `  (${r.note})` : ''}`);
      process.exitCode = results.every((r) => r.status === 'ok') ? 0 : 1;
    } else {
      const solutionDir = path.resolve(positional[0] ?? '.');
      if (!fs.existsSync(path.join(solutionDir, 'index.jigx'))) throw new Error(`no index.jigx in ${solutionDir}; pass the solution folder`);
      const summary = summarise(scanner.scanSolution(solutionDir, data), solutionDir);
      if (asJson) console.log(JSON.stringify({...summary, iconSkill: skillDir, migrationSteps: summary.status === 'needs-migration' ? MIGRATION_STEPS : []}, null, 2));
      else printReport(summary);
      process.exitCode = summary.status === 'needs-migration' ? 1 : 0;
    }
  } catch (error) {
    console.error(`Icon check failed: ${error.message}`);
    process.exitCode = 2;
  }
}
