#!/usr/bin/env node
// Drafts a UX change-proposal list for a Jigx solution, for the owner to approve before
// anything is implemented. Combines ux-lint findings and the icon check into numbered
// proposals (P1, P2, ...) with checkboxes. Writes only the proposals file.
//
// Usage: node propose.mjs <solution or Core SDK project> [--only <folder>] [--flow <screen>] [--out <file>] [--stdout] [--json] [--icon-skill <path>]
// Default output: ~/jigx-ux-reviews/<solution>/<branch>/ux-proposals.md (never inside the repo).
// See references/change-proposals.md for the approval workflow.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {lintProject, scopeArgs} from './ux-lint.mjs';
import {findIconSkill, loadTool, summarise, INSTALL_STEPS} from './check-icons.mjs';

const SEVERITY = {error: 'High', warning: 'Medium', info: 'Low'};
const ORDER = {High: 0, Medium: 1, Low: 2};
const EFFORT = {S: 'S (minutes, small edit)', M: 'M (several screens or a shared part)', L: 'L (flow change, test on a device)'};

// Plain-language text for each lint code, written for a solution owner who doesn't read YAML.
// problem = what users see today, why = why it matters, fix = what would change.
// `check` = the owner should confirm each place, because some may be intentional.
export const FIXES = {
  'destructive-swipe-without-confirm': {title: 'Ask before a swipe deletes something',
    problem: 'Swiping a row and tapping Delete removes it straight away, with no "are you sure?" and no undo.',
    why: 'Swipes are easy to trigger by accident, for example while scrolling with gloves on. The user loses the line and may not notice. Where the delete goes to the server (ERP), it can\'t be undone at all.',
    fix: 'Show a short question first that names what will be lost ("Delete this line? It hasn\'t been sent yet.") with the buttons "Delete line" and "Keep".', effort: 'S'},
  'destructive-icon-mismatch': {title: 'Show a bin icon on delete actions',
    problem: 'Delete actions show an icon that means something else, such as a pencil (edit).',
    why: 'Users recognise the icon before they read the label. A pencil on Delete invites a tap that deletes instead of edits.',
    fix: 'Use the bin icon (trash) on every delete action.', effort: 'S'},
  'destructive-color': {title: 'Show delete actions in red',
    problem: 'Delete actions use the normal button colour.',
    why: 'Red warns that the action can\'t easily be undone. Without it, Delete looks like any other action.',
    fix: 'Use the red (negative) colour for delete actions.', effort: 'S'},
  'sync-tag-colours': {title: 'Give sync tags one colour per meaning',
    problem: 'Tags that all mean "waiting to upload" have different colours, or the same tag has a different colour on another screen (see the table).',
    why: 'Users read colour first. Several colours for one situation look like several situations, and a red "waiting" tag looks like an error when nothing is wrong.',
    fix: 'Give every "waiting, uploads by itself" tag one calm colour (for example grey or blue), keep red only for problems the user must act on, and use the same colour for a tag on every screen.', effort: 'S', check: true},
  'sync-state-negative': {title: 'Don\'t show "waiting to sync" in red',
    problem: 'Records that are saved on the phone but not yet sent are tagged in red, the same colour as errors.',
    why: 'Waiting to sync is normal, especially offline. Red makes users think something failed, so they redo work or call support.',
    fix: 'Use one neutral tag ("Waiting to sync") for records not sent yet, and keep red only for records that really failed to sync.', effort: 'S'},
  'discard-alert-off': {title: 'Warn before leaving a form with unsaved changes',
    problem: 'The "discard changes?" warning is switched off on these forms, so going back closes the form and throws away what was typed.',
    why: 'A back swipe or a phone call is enough to lose several minutes of input without any warning.',
    fix: 'Turn the warning on, but only when something was actually changed, and turn it off after a successful save so it doesn\'t appear by mistake.', effort: 'M', check: true},
  'generic-copy': {title: 'Make error and offline messages say what to do',
    problem: 'Messages like "Something went wrong" or "Oops" don\'t say what happened or what to do next.',
    why: 'Users can\'t fix the problem themselves, so they retry blindly, give up, or call support.',
    fix: 'Say what happened and the next step, in plain words. For example: "You\'re offline. Refresh needs a connection; your changes are saved on this device." Don\'t ask users to screenshot and email: if they need help, point to the customer\'s own helpdesk from a setting, or "contact your administrator".', effort: 'S'},
  'generic-label': {title: 'Use button labels that say what happens',
    problem: 'Buttons are labelled OK, Submit, Yes or No.',
    why: 'In a question like "Delete photo?", "Yes / No" makes the user read the question again. A label with the action can be tapped with confidence.',
    fix: 'Name the result on the button, for example "Delete photo" and "Keep editing".', effort: 'S', check: true},
  'na-literal': {title: 'Hide empty values instead of showing "N/A"',
    problem: 'When a value is missing, the screen shows "N/A".',
    why: '"N/A" adds noise and can be read as a real value ("not applicable") rather than "not filled in".',
    fix: 'Hide the row, or leave that part out, when there is no value.', effort: 'S', check: true},
  'hardcoded-date-format': {title: 'Show dates and times the same way everywhere',
    problem: 'These screens use their own date or time format instead of the shared one.',
    why: 'The same date looks different from screen to screen, and some formats are wrong for the user\'s country (for example 03/04 read as March or April).',
    fix: 'Use the solution\'s shared date and time format on these screens, and in the scripts that build PDFs and prints, so a date looks the same on the screen and on paper.', effort: 'M', check: true},
  'raw-error-text': {title: 'Show errors in plain words',
    problem: 'The technical error from the server or ERP is shown to the user as it is.',
    why: 'Technical text means nothing to a field user and can expose internal details.',
    fix: 'Show a short message with a next step ("Couldn\'t save the line. Check the quantity and try again."), and keep the technical details for support.', effort: 'M', check: true},
  'raw-json': {title: 'Don\'t show raw record data on screen',
    problem: 'A whole record is shown as raw data text ({"id": ...}).',
    why: 'It is unreadable for users and looks broken.',
    fix: 'Show only the fields the user needs, with labels.', effort: 'S'},
  'icon-from-data': {title: 'Make sure icons that come from data can be shown',
    problem: 'Some icons are chosen by data (a table value or a calculation) instead of being written in the screen.',
    why: 'The app only shows icons it knows about in advance. An icon name that only exists in data can show as a red question mark.',
    fix: 'List every possible icon value from these sources in assets/icons.jigx, using Tabler names.', effort: 'S', check: true},
  'error-in-toast': {title: 'Keep errors on screen until the user has seen them',
    problem: 'Errors are shown in a short pop-up message that disappears after a few seconds.',
    why: 'If the user looks away, they miss the error and think the action worked.',
    fix: 'Show the error on the screen or on the record (a banner or a message box) until it is fixed or dismissed.', effort: 'S', check: true},
  'too-many-actions': {title: 'Show at most two buttons at the bottom of the screen',
    problem: 'Some screens can show three or more buttons at the bottom at the same time, or hide some of them behind a three-dots menu.',
    why: 'Three buttons get cut-off labels and look equally important, so it is not clear what to do next. Users rarely open the three-dots menu, so actions there get missed.',
    fix: 'For each screen, list which buttons show in which state (normal, error, ...). Keep at most two per state: the main action follows the state (e.g. Retry during an upload error), other actions move to the header or become rows on the screen, and buttons that are disabled in that state are dropped. The exact layout per screen is in the proposal notes.', effort: 'M', check: true},
  'custom-layout': {title: 'Check custom-built parts match the rest of the app',
    problem: 'These screens use custom components or hand-built layouts instead of the standard Jigx components.',
    why: 'Custom parts often look different from the rest of the app (other text sizes, no card style, extra icons) and can break on small phones or with large text.',
    fix: 'Compare each one with the standard component for the same job on a device. Switch to the standard component where it fits, otherwise align text, spacing, cards, icons and tags.', effort: 'M', check: true},
  'prefilled-number-default': {title: 'Clear default numbers when the field is tapped',
    problem: 'Number fields start with a default such as 1. Tapping the field and typing adds to it, so typing 2 gives 12.',
    why: 'The user ends up with the wrong quantity and a wrong total, often without noticing.',
    fix: 'Clear the default when the field is tapped (isTextClearedOnFocus) and use the default if the field is left empty. Fields that show an existing saved value keep it.', effort: 'S', check: true},
  'missing-title': {title: 'Give every screen a title',
    problem: 'These screens have no title.',
    why: 'Without a title, users can lose track of where they are, especially after following a link.',
    fix: 'Add a title that names what is on the screen.', effort: 'S'},
  'missing-header': {title: 'Add the header image to full screens',
    problem: 'These screens (lists, menus, home or forms) have no header image, while other screens in the app do.',
    why: 'This is polish: the header shows which part of the app the user is in and keeps the app looking consistent.',
    fix: 'Add the small header image for that area, on forms too (not on bottom sheets or pop-ups).', effort: 'S', check: true},
  'email-in-text': {title: "Don't show a person's email address in messages",
    problem: 'Messages ask users to email a specific person (for example a developer\'s address).',
    why: 'People change jobs and inboxes fill up, so users end up writing to nobody. It also exposes a personal address to every customer user.',
    fix: 'First rewrite the message so it says what the user can do now (retry, or that the data is saved and will sync). If a contact is still needed, take it from a setting each customer fills in (their own helpdesk), or say "contact your administrator" when it is empty. Never a person\'s address, and not a Jigx address: the users work for the customer. A "Report a problem" action that sends the details itself is a larger, separate change.', effort: 'S'},
  'erp-wording': {title: 'Use plain words instead of ERP shorthand',
    problem: 'Labels and values use ERP shorthand or internal placeholders, such as "Related Svc. Doc. Type", "Appointment nbr.", " || " as a separator, or "<NEW>" as a number.',
    why: 'Field users don\'t know the ERP\'s abbreviations. Placeholders like <NEW> look like a broken value.',
    fix: 'Write labels out in plain words ("Service appointment"), use a normal separator ( · ), and show "Not sent yet" instead of a placeholder number.', effort: 'S', check: true},
  'unused-part': {title: 'Remove parts no screen uses',
    problem: 'These components, functions or actions are not used by any screen, so users never see them.',
    why: 'They are not a UX problem, but they make the solution harder to read and they show up in every review.',
    fix: 'Delete them, or keep them on purpose and leave them out of UX reviews. Check first that nothing outside the solution (another solution, a script) calls them.', effort: 'S', check: true},
};

// When no screen in the app has a header image, it is one app-wide decision, not a fix per screen.
const APP_WIDE_HEADER = {title: 'Decide once whether the app uses header images',
  problem: 'No screen in the app has a header image.',
  why: 'Headers show which part of the app the user is in. This is a choice for the whole app, not a fix screen by screen.',
  fix: 'Decide for the whole app. If yes, add the small header image to the full screens below: lists, menus, home and forms (not bottom sheets or pop-ups). If no, reject this proposal.', effort: 'S', check: false};

// Owned by the icon-migration skill (its fromData list), so not proposed here.
const LEFT_TO_ICON_MIGRATION = new Set(['icon-from-data']);

export function buildProposals(lintFindings, icons) {
  const groups = new Map();
  for (const f of lintFindings) {
    if (LEFT_TO_ICON_MIGRATION.has(f.code)) continue;
    const g = groups.get(f.code) ?? {code: f.code, severity: SEVERITY[f.severity] ?? 'Low', places: [], messages: new Map(), verify: {}};
    // A finding that is High (error) anywhere makes the whole proposal High.
    if (ORDER[SEVERITY[f.severity]] < ORDER[g.severity]) g.severity = SEVERITY[f.severity];
    const place = `${f.file}:${f.line}${f.source ? ` (from ${f.source})` : ''}`;
    g.places.push(place);
    // The lint can't decide this one from the source alone (it depends on data or on where a value is set).
    if (f.verify) g.verify[place] = f.verify;
    if (f.tags) g.tags = f.tags;
    if (f.excerpt) g.messages.set(f.excerpt, (g.messages.get(f.excerpt) ?? 0) + 1);
    groups.set(f.code, g);
  }
  const proposals = [...groups.values()].map((g) => {
    const appWide = g.code === 'missing-header' && lintFindings.some((f) => f.code === 'missing-header' && f.appWide);
    const meta = appWide ? {...FIXES[g.code], ...APP_WIDE_HEADER} : FIXES[g.code] ?? {title: g.code, fix: 'Review and fix.', effort: 'S', check: true};
    return {source: `ux-lint:${g.code}`, severity: g.severity, title: meta.title, problem: meta.problem, why: meta.why, fix: meta.fix, effort: meta.effort,
      check: !!meta.check, rule: lintFindings.find((f) => f.code === g.code)?.message.match(/\(([^)]*rule[^)]*)\)/)?.[1] ?? '', places: g.places,
      messages: [...g.messages].map(([text, count]) => ({text, count})).sort((a, b) => b.count - a.count), verify: g.verify, tags: g.tags};
  });
  if (icons?.status === 'needs-migration') {
    const names = [...icons.legacy.map((l) => `${l.name} → ${l.suggested}`), ...icons.unknown.map((u) => `${u.name} → (needs a choice)`)];
    const unknown = icons.counts.unknownNames;
    proposals.push({source: 'check-icons', severity: 'Medium', title: `Move ${icons.counts.legacyNames + unknown} icon names to the new icon set`,
      problem: `The solution still uses icon names from the old icon set (Streamline)${unknown ? `, and ${unknown} names that exist in neither set` : ''}.`,
      why: `Jigx apps now use the Tabler icon set, which loads faster. Old names still work for now, but some names exist in both sets and now draw a different picture (for example arrow-right is now a full arrow instead of a chevron)${unknown ? '. Names that exist in neither set show a red question mark' : ''}.`,
      fix: `Run the icon-migration tool on this solution. It renames the icons and opens a review page where every pick can be checked and changed before publishing${unknown ? '. Names marked "needs a choice" need a new icon picked by hand' : ''}.`, effort: 'M', check: false,
      rule: 'icons.md', places: names});
  }
  proposals.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || b.places.length - a.places.length);
  return proposals.map((p, i) => ({id: `P${i + 1}`, ...p}));
}

export function renderMarkdown({solution, date, proposals, notes = []}) {
  const out = [];
  out.push(`# UX change proposals: ${solution}`, '');
  out.push(`Drafted ${date}. Nothing has been changed yet.`, '');
  out.push('**Checked:** each place says whether it was checked in the source: **confirmed** (a real problem), **intentional** (left out of the fix, with the reason), **needs verification** (the source cannot settle it, e.g. it depends on data: check it on a device or answer the question) or **not checked yet**.', '');
  out.push('**How to approve:** tick **Approve** under each proposal to implement (`- [x] **Approve**`), or reply with IDs, e.g. "approve P1, P3-P5; reject P2; P4 except jigs/x.jigx". Add a note under any proposal to change the fix. Only approved proposals are implemented.', '', '**Severity:** High = data can be lost or users get stuck; Medium = slows down or confuses everyday work; Low = polish.', '');
  for (const n of notes) out.push(`> ${n}`, '');
  out.push('| ID | Severity | Proposal | Where (count) | Effort |', '| --- | --- | --- | --- | --- |');
  for (const p of proposals) out.push(`| ${p.id} | ${p.severity} | ${p.title} | ${p.places.length} | ${p.effort} |`);
  out.push('');
  for (const p of proposals) {
    out.push(`## ${p.id} [${p.severity}] ${p.title}`, '');
    out.push('- [ ] **Approve**');
    if (p.problem) out.push(`- **What's wrong:** ${p.problem}`);
    if (p.why) out.push(`- **Why change it:** ${p.why}`);
    out.push(`- **Proposed fix:** ${p.fix}`);
    if (p.rule) out.push(`- **Rule:** ${p.rule}`);
    out.push(`- **Effort:** ${EFFORT[p.effort] ?? p.effort}${p.check ? ' · check each place first, some may be intentional' : ''}`);
    out.push(`- **Source:** ${p.source}`);
    out.push(`- **Status:** proposed`);
    if (p.messages?.length) {
      out.push(`- **Messages found (${p.messages.length}):**`);
      for (const m of p.messages.slice(0, 10)) out.push(`  - "${m.text}" (${m.count} ${m.count === 1 ? 'place' : 'places'})`);
    }
    if (p.tags?.length) {
      out.push('- **Sync tags in the app:**', '', '  | Tag | Means | Colour today |', '  | --- | --- | --- |');
      const rows = new Map();
      for (const t of p.tags) { const k = t.label.toLowerCase(); rows.set(k, {...t, colors: [...new Set([...(rows.get(k)?.colors ?? []), t.color])]}); }
      for (const t of [...rows.values()].sort((a, b) => b.kind.localeCompare(a.kind) || a.label.localeCompare(b.label))) out.push(`  | ${t.label} | ${t.kind === 'waiting' ? 'waiting, uploads by itself' : 'problem, the user must act'} | ${t.colors.join(' / ')} |`);
      out.push('');
    }
    out.push(`- **Where it happens (${p.places.length}):**`);
    for (const place of p.places.slice(0, 40)) out.push(`  - ${place} · ${p.verify?.[place] ? `needs verification: ${p.verify[place]}` : 'not checked yet'}`);
    if (p.places.length > 40) out.push(`  - ... ${p.places.length - 40} more (run the script with --json for all)`);
    out.push('');
  }
  out.push('## Not proposed here', '', '_Icons that come from data (tables, expressions) are handled by the icon-migration skill: its fromData list traces each one to the datasource. Run `/icon-migration` for those._', '');
  out.push('## Manual findings', '', '_Findings from the journey walkthrough (ux-review.md section 3) are added here as further proposals, in the same format._', '');
  return out.join('\n');
}

// ~/jigx-ux-reviews/<solution>/<branch>/ux-proposals.md, so nothing lands in the repo.
function defaultOut(project, solution, scope = {}) {
  let branch = 'no-git';
  const git = (...args) => execFileSync('git', ['-C', project, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
  try { branch = git('rev-parse', '--abbrev-ref', 'HEAD'); } catch {}
  // A detached worktree (how USAGE.md reviews another branch): use the branch whose tip it is, or the short SHA.
  if (branch === 'HEAD') {
    try {
      const names = git('branch', '-a', '--points-at', 'HEAD', '--format=%(refname:short)').split('\n').filter((b) => b && !/HEAD|^\(/.test(b));
      branch = names.find((b) => b.startsWith('origin/'))?.replace(/^origin\//, '') ?? names[0] ?? git('rev-parse', '--short', 'HEAD');
    } catch { branch = 'detached'; }
  }
  const part = [scope.flow, ...(scope.only ?? [])].filter(Boolean).map((x) => path.basename(x)).join('-');
  return path.join(os.homedir(), 'jigx-ux-reviews', solution, branch.replace(/[^\w.-]+/g, '-'), `ux-proposals${part ? `-${part.replace(/[^\w.-]+/g, '-')}` : ''}.md`);
}

async function iconSummary(solutionDir, explicit) {
  const skillDir = findIconSkill({explicit});
  if (!skillDir) return {summary: null, note: `Icons were not checked: the icon-migration skill is not installed. ${INSTALL_STEPS.slice(1, 4).map((s) => s.trim()).join(' / ')}`};
  const {scanner, data} = await loadTool(skillDir);
  return {summary: summarise(scanner.scanSolution(solutionDir, data), solutionDir), note: null};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {scope, rest: argv} = scopeArgs(process.argv.slice(2));
  const take = (flag) => { const i = argv.indexOf(flag); if (i < 0) return undefined; const v = argv[i + 1]; argv.splice(i, 2); return v; };
  const out = take('--out');
  const explicit = take('--icon-skill');
  const positional = argv.filter((a) => !a.startsWith('--'));
  try {
    const {target, findings} = lintProject(positional[0] ?? '.', scope);
    const solutionDir = target.root;
    const {summary, note} = await iconSummary(solutionDir, explicit);
    const proposals = buildProposals(findings, summary);
    const notes = note ? [note] : [];
    const solution = path.basename(target.kind === 'sdk' ? target.project : solutionDir);
    if (scope.only.length || scope.flow) notes.push(`Scope: ${[scope.flow && `the flow from ${scope.flow}`, scope.only.length && scope.only.join(', ')].filter(Boolean).join(' within ')}. The rest of the solution was not reviewed; icons are checked for the whole solution.`);
    if (target.kind === 'sdk') notes.push('Core SDK (TypeScript) project: findings point at the generated build/ files, with the src/ file that generates them where it was found. Fix in src/, never in build/; the next build overwrites it.');
    const date = new Date().toISOString().slice(0, 10);
    if (argv.includes('--json')) {
      console.log(JSON.stringify({solution, date, proposals, notes}, null, 2));
    } else {
      const md = renderMarkdown({solution, date, proposals, notes});
      if (argv.includes('--stdout')) console.log(md);
      else {
        const file = path.resolve(out ?? defaultOut(target.project, solution, scope));
        fs.mkdirSync(path.dirname(file), {recursive: true});
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
