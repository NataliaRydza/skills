#!/usr/bin/env node
// Drafts a UX change-proposal list for a Jigx solution, for the owner to approve before
// anything is implemented. Combines ux-lint findings and the icon check into numbered
// proposals (P1, P2, ...) with checkboxes. Writes only the proposals file.
//
// Usage: node propose.mjs <solution> [--out <file>] [--stdout] [--json] [--icon-skill <path>]
// See references/change-proposals.md for the approval workflow.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {lintSolution} from './ux-lint.mjs';
import {findIconSkill, loadTool, summarise, INSTALL_STEPS} from './check-icons.mjs';

const SEVERITY = {error: 'High', warning: 'Medium', info: 'Low'};
const ORDER = {High: 0, Medium: 1, Low: 2};

// What the agent would change for each lint code. `check` = the owner should confirm each place.
export const FIXES = {
  'destructive-swipe-without-confirm': {title: 'Confirm destructive swipe actions', fix: 'Wrap the action in action.confirm that names what is lost ("Delete line? It hasn\'t been sent yet."), buttons "Delete line" / "Keep".', effort: 'S'},
  'destructive-swipe-confirm-unverified': {title: 'Verify shared delete actions confirm', fix: 'Check the called action; add action.confirm if it deletes without asking.', effort: 'S', check: true},
  'destructive-icon-mismatch': {title: 'Use a delete icon on delete actions', fix: 'Replace the icon with trash.', effort: 'S'},
  'destructive-color': {title: 'Use the negative colour on delete actions', fix: 'Set color: negative.', effort: 'S'},
  'sync-state-negative': {title: 'Stop colouring "waiting to sync" as an error', fix: 'Use one tag text ("Waiting to sync") in a neutral colour or style.isWaitingSync; keep negative for real sync failures.', effort: 'S'},
  'discard-alert-off': {title: 'Turn on discard warnings for forms', fix: 'Bind isDiscardChangesAlertEnabled to the form\'s isDirty state and turn it off before navigating after a successful save.', effort: 'M', check: true},
  'generic-copy': {title: 'Rewrite generic error and offline messages', fix: 'Say what happened and what to do, in neutral words (e.g. "You\'re offline. Refresh needs a connection; your changes are saved on this device.").', effort: 'S'},
  'generic-label': {title: 'Use specific button labels', fix: 'Replace OK/Submit/Yes/No with the outcome verb ("Delete photo", "Keep editing").', effort: 'S', check: true},
  'na-literal': {title: 'Hide missing values instead of showing N/A', fix: 'Hide the row or drop the part when the value is missing.', effort: 'S', check: true},
  'hardcoded-date-format': {title: 'Use the shared date/time format', fix: 'Replace one-off formats with the solution\'s shared date/time helper or setting.', effort: 'M', check: true},
  'raw-error-text': {title: 'Show plain-language errors', fix: 'Map the error to a short user message with a next step; keep technical detail for logs/support.', effort: 'M', check: true},
  'raw-json': {title: 'Remove raw record data from screens', fix: 'Show the user-facing fields instead of a stringified record.', effort: 'S'},
  'icon-from-data': {title: 'Register icons that come from data', fix: 'List every possible icon value from these sources in assets/icons.jigx, using Tabler names.', effort: 'S', check: true},
  'error-in-toast': {title: 'Keep actionable errors on screen', fix: 'Show the error as a banner or modal (or record row state) instead of a disappearing toast.', effort: 'S', check: true},
  'missing-title': {title: 'Add screen titles', fix: 'Add a title naming what the user sees.', effort: 'S'},
  'missing-header': {title: 'Add header images to list/default screens', fix: 'Add a small jig-header with the area\'s registered image (skip bottom sheets and modals).', effort: 'S', check: true},
};

export function buildProposals(lintFindings, icons) {
  const groups = new Map();
  for (const f of lintFindings) {
    const g = groups.get(f.code) ?? {code: f.code, severity: SEVERITY[f.severity] ?? 'Low', places: []};
    g.places.push(`${f.file}:${f.line}`);
    groups.set(f.code, g);
  }
  const proposals = [...groups.values()].map((g) => {
    const meta = FIXES[g.code] ?? {title: g.code, fix: 'Review and fix.', effort: 'S', check: true};
    return {source: `ux-lint:${g.code}`, severity: g.severity, title: meta.title, fix: meta.fix, effort: meta.effort,
      check: !!meta.check, rule: lintFindings.find((f) => f.code === g.code)?.message.match(/\(([^)]*rule[^)]*)\)/)?.[1] ?? '', places: g.places};
  });
  if (icons?.status === 'needs-migration') {
    const names = [...icons.legacy.map((l) => `${l.name} → ${l.suggested}`), ...icons.unknown.map((u) => `${u.name} → (needs a choice)`)];
    proposals.push({source: 'check-icons', severity: 'Medium', title: `Migrate ${icons.counts.legacyNames + icons.counts.unknownNames} icon names to Tabler outline`,
      fix: 'Run the icon-migration skill on this solution, then review its picks on the review page before publishing.', effort: 'M', check: false,
      rule: 'icons.md', places: names});
  }
  if (icons && (icons.counts?.fromData || icons.counts?.dynamic)) {
    proposals.push({source: 'check-icons:data', severity: 'Low', title: 'Check icon values stored in data',
      fix: 'Owner action: make sure icon values in these tables/sources are Tabler names and registered in assets/icons.jigx. The agent cannot change data at the source.',
      effort: 'S', check: true, rule: 'core rule 1.3', places: [...icons.fromData.map((d) => `${d.source} (${d.file}:${d.line})`), ...icons.dynamic.map((d) => `${d.file}:${d.line}`)]});
  }
  proposals.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || b.places.length - a.places.length);
  return proposals.map((p, i) => ({id: `P${i + 1}`, ...p}));
}

export function renderMarkdown({solution, date, proposals, notes = []}) {
  const out = [];
  out.push(`# UX change proposals: ${solution}`, '');
  out.push(`Drafted ${date}. Nothing has been changed yet.`, '');
  out.push('**How to approve:** tick **Approve** under each proposal to implement (`- [x] **Approve**`), or reply with IDs, e.g. "approve P1, P3-P5; reject P2; P4 except jigs/x.jigx". Add a note under any proposal to change the fix. Only approved proposals are implemented.', '');
  for (const n of notes) out.push(`> ${n}`, '');
  out.push('| ID | Severity | Proposal | Places | Effort |', '| --- | --- | --- | --- | --- |');
  for (const p of proposals) out.push(`| ${p.id} | ${p.severity} | ${p.title} | ${p.places.length} | ${p.effort} |`);
  out.push('');
  for (const p of proposals) {
    out.push(`## ${p.id} [${p.severity}] ${p.title}`, '');
    out.push('- [ ] **Approve**');
    out.push(`- **Fix:** ${p.fix}`);
    if (p.rule) out.push(`- **Rule:** ${p.rule}`);
    out.push(`- **Effort:** ${p.effort}${p.check ? ' · each place needs a look (some may be intentional)' : ''}`);
    out.push(`- **Source:** ${p.source}`);
    out.push(`- **Status:** proposed`);
    out.push('- **Places:**');
    for (const place of p.places.slice(0, 40)) out.push(`  - ${place}`);
    if (p.places.length > 40) out.push(`  - ... ${p.places.length - 40} more (run the script with --json for all)`);
    out.push('');
  }
  out.push('## Manual findings', '', '_Findings from the journey walkthrough (ux-review.md section 3) are added here as further proposals, in the same format._', '');
  return out.join('\n');
}

async function iconSummary(solutionDir, explicit) {
  const skillDir = findIconSkill({explicit});
  if (!skillDir) return {summary: null, note: `Icons were not checked: the icon-migration skill is not installed. ${INSTALL_STEPS.slice(1, 4).map((s) => s.trim()).join(' / ')}`};
  const {scanner, data} = await loadTool(skillDir);
  return {summary: summarise(scanner.scanSolution(solutionDir, data), solutionDir), note: null};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const take = (flag) => { const i = argv.indexOf(flag); if (i < 0) return undefined; const v = argv[i + 1]; argv.splice(i, 2); return v; };
  const out = take('--out');
  const explicit = take('--icon-skill');
  const positional = argv.filter((a) => !a.startsWith('--'));
  try {
    const solutionDir = path.resolve(positional[0] ?? '.');
    if (!fs.existsSync(path.join(solutionDir, 'index.jigx'))) throw new Error(`no index.jigx in ${solutionDir}; pass the solution folder`);
    const {summary, note} = await iconSummary(solutionDir, explicit);
    const proposals = buildProposals(lintSolution(solutionDir), summary);
    const date = new Date().toISOString().slice(0, 10);
    if (argv.includes('--json')) {
      console.log(JSON.stringify({solution: path.basename(solutionDir), date, proposals, notes: note ? [note] : []}, null, 2));
    } else {
      const md = renderMarkdown({solution: path.basename(solutionDir), date, proposals, notes: note ? [note] : []});
      if (argv.includes('--stdout')) console.log(md);
      else {
        const file = path.resolve(out ?? path.join(solutionDir, 'ux-proposals.md'));
        if (fs.existsSync(file)) throw new Error(`${file} already exists; it may hold the owner's approvals. Pass --out <new file> or remove it first.`);
        fs.writeFileSync(file, md);
        console.log(`Wrote ${proposals.length} proposals to ${file}`);
      }
    }
  } catch (error) {
    console.error(`Proposal draft failed: ${error.message}`);
    process.exitCode = 2;
  }
}
