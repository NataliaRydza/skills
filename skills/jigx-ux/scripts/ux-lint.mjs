#!/usr/bin/env node
// Dependency-free UX heuristics for Jigx solution sources (*.jigx). No network or writes.
// Line-based on purpose: it reads YAML source without a parser, so every finding is a
// prompt for review, not proof of a defect. See references/ux-review.md.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const indentOf = (line) => line.length - line.trimStart().length;

// Lines that belong to the YAML item starting at `start` (deeper indentation, or blank).
function blockOf(lines, start) {
  const base = indentOf(lines[start]);
  let end = start + 1;
  while (end < lines.length && (lines[end].trim() === '' || indentOf(lines[end]) > base)) end++;
  return {start, end, text: lines.slice(start, end).join('\n')};
}

const DESTRUCTIVE_LABEL = /^\s*-\s*label:\s*['"]?(delete|remove|discard|clear)\b/i;
const GENERIC_COPY = /\b(oops|something went wrong|an error occurred|error occurred)\b/i;
const GENERIC_BUTTON = /^\s*(title|confirm|cancel):\s*['"]?(ok|submit|yes|no)['"]?\s*$/i;
const NA_LITERAL = /'N\/A'|"N\/A"/;
const DATE_FORMAT = /^\s*format:\s*['"]?[^'"\n{]*(YYYY|DD[./-]|MM[./-]|HH:mm|hh:mm)/;
const DATE_PICTURE = /\$fromMillis\([^)]*,\s*['"]\[/;
const SYNC_WORDS = /\b(local|not synced|unsynced|pending sync|waiting to sync|offline)\b/i;
const RAW_ERROR = /^\s*(title|subtitle|description|text|value):\s*=.*\.(errorMessage|error|exception|stack|responseBody|response)\b/;
const RAW_JSON = /^\s*(title|subtitle|description|text|value):\s*=\s*\$string\(@ctx\.(current\.item|datasources\.[\w-]+)\)\s*$/;
const DATA_ICON = /^\s*icon:\s*['"]?=.*@ctx\.(current\.item|datasources)/;
const NUMBER_DEFAULT = /^\s*initialValue:\s*['"]?-?\d+(\.\d+)?['"]?\s*$/;
const STRING_KEYS = /^\s*-?\s*(title|label|subtitle|description|text|confirm|cancel|helperText|placeholder):\s*(.+)$/;

const cleanTitle = (value) => value.trim().replace(/^['"]|['"]$/g, '').replace(/^\|$/, '').trim();

// The bottom action groups of a jig: top-level `actions:` -> `- children:` -> `- type: action.*`.
// Returns each group's buttons with their title and whether they are only shown in some states.
export function bottomActions(lines) {
  const top = lines.findIndex((l) => /^actions:\s*$/.test(l));
  if (top < 0) return [];
  const block = blockOf(lines, top);
  const groups = [];
  for (let i = block.start + 1; i < block.end; i++) {
    if (!/^\s*-?\s*children:\s*$/.test(lines[i])) continue;
    const kids = blockOf(lines, i);
    const first = lines.slice(i + 1, kids.end).find((l) => /^\s*-\s*type:/.test(l));
    if (!first) continue;
    const c = indentOf(first);
    const buttons = [];
    for (let k = i + 1; k < kids.end; k++) {
      if (indentOf(lines[k]) !== c || !/^\s*-\s*type:\s*action\./.test(lines[k])) continue;
      const b = blockOf(lines, k).text.split('\n');
      const at = (key) => b.findIndex((l) => indentOf(l) === c + 4 && new RegExp(`^\\s*${key}:`).test(l));
      const t = at('title');
      let title = t >= 0 ? cleanTitle(b[t].replace(/^\s*title:/, '')) : '';
      if (t >= 0 && !title) title = (b[t + 1] ?? '').trim();
      if (title.startsWith('=')) {
        // Expression titles: show the first literal label it can produce.
        const expr = b.slice(t, t + 4).join(' ');
        const literal = (expr.match(/[?:]\s*'([^'$@]{2,40})'/) ?? expr.match(/'([^'$@]*\s[^'$@]*)'/))?.[1];
        title = literal ? `"${literal}"/...` : '(label from an expression)';
      }
      buttons.push({line: k, title: title || lines[k].trim().replace(/^-\s*type:\s*/, ''), conditional: at('isHidden') >= 0});
    }
    const before = lines.slice(block.start, i).reverse().find((l) => /numberOfVisibleActions:/.test(l));
    const visible = before ? Number(before.match(/numberOfVisibleActions:\s*(\d+)/)?.[1]) : undefined;
    groups.push({line: i, visible, buttons});
  }
  return groups;
}

// User-visible literal text (not expressions), for a spelling and wording pass.
export function collectStrings(text, file = '<source>') {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*#/.test(line)) return;
    const m = line.match(STRING_KEYS);
    if (!m) return;
    const value = cleanTitle(m[2]);
    if (!value || value.startsWith('=') || value.startsWith('@') || /^[\w.-]+$/.test(value) && !/\s/.test(value) && /[-_.]/.test(value)) return;
    if (!/[a-z]{3}/i.test(value)) return;
    out.push({text: value, file, line: i + 1});
  });
  return out;
}

export function lintSource(text, file = '<source>') {
  const findings = [];
  const lines = text.split(/\r?\n/);
  const add = (code, index, message, severity = 'warning') =>
    findings.push({severity, code, file, line: index + 1, message});

  const jigType = text.match(/^type:\s*(jig\.[\w-]+)/m)?.[1];
  if (jigType) {
    if (!/^title:/m.test(text)) add('missing-title', 0, 'Full screens need a title naming what the user sees (core rule 1.1).');
    if (/^jig\.(default|list)$/.test(jigType) && !/^header:/m.test(text))
      add('missing-header', 0, 'Default/list screens need a small header image unless used as a bottom sheet or modal (core rule 1.2).', 'info');
  }

  for (const group of bottomActions(lines)) {
    const n = group.buttons.length;
    if (n <= 2) continue;
    const always = group.buttons.filter((b) => !b.conditional).length;
    const names = group.buttons.map((b) => `${b.title}${b.conditional ? ' (some states)' : ''}`).join(', ');
    const overflow = group.visible !== undefined && group.visible < n ? ` ${n - group.visible} of them sit behind the three-dots menu.` : '';
    add('too-many-actions', group.line, `${n} bottom actions: ${names}. ${always} always shown.${overflow} Show at most 2 per state; move the rest (actions-layout.md, core rule 2.12).`);
  }

  if (/^\s*-?\s*type:\s*component\.custom-component\b/m.test(text) || /type:\s*component\.view\b[\s\S]*type:\s*component\.text\b/.test(text)) {
    const at = lines.findIndex((l) => /type:\s*component\.(custom-component|view)\b/.test(l));
    add('custom-layout', at, 'Custom component or hand-built layout; compare it with the native component for the same job on a device (custom-components.md, core rule 1.14).', 'info');
  }

  let dataIconReported = false;
  lines.forEach((line, i) => {
    if (/^\s*#/.test(line)) return;

    if (/isDiscardChangesAlertEnabled:\s*false\b/.test(line))
      add('discard-alert-off', i, 'Discard warning is hard-disabled; bind it to dirty state so edits are not lost (core rule 4.3).');

    if (GENERIC_COPY.test(line))
      add('generic-copy', i, 'Say what happened and what to do, in neutral words (feedback-and-sync.md section 3).');
    if (GENERIC_BUTTON.test(line))
      add('generic-label', i, 'Use a specific verb that names the outcome instead of OK/Submit/Yes/No (core rule 2.3).', 'info');

    if (NA_LITERAL.test(line))
      add('na-literal', i, "If 'N/A' is shown for a missing value, hide the row instead (core rule 1.4). Ignore when it is a real answer option.", 'info');

    if (DATE_FORMAT.test(line) || DATE_PICTURE.test(line))
      add('hardcoded-date-format', i, "Dates/times should follow the solution's shared display format (core rule 1.5).", 'info');

    if (RAW_ERROR.test(line))
      add('raw-error-text', i, 'An error value is shown directly; make sure it is plain words, never a raw ERP/system payload (core rule 3.6).', 'info');
    if (RAW_JSON.test(line))
      add('raw-json', i, 'A whole record is stringified onto the screen; show user fields instead (core rule 1.6).');

    if (!dataIconReported && DATA_ICON.test(line)) {
      dataIconReported = true;
      add('icon-from-data', i, 'Icons come from data here; every possible value must be registered in assets/icons.jigx (core rule 1.3).', 'info');
    }

    if (DESTRUCTIVE_LABEL.test(line)) {
      const block = blockOf(lines, i);
      if (!/action\.confirm\b/.test(block.text)) {
        if (/action\.execute-action\b/.test(block.text))
          add('destructive-swipe-confirm-unverified', i, 'Destructive swipe calls a shared action; verify that action confirms and names what is lost (core rule 2.8).');
        else
          add('destructive-swipe-without-confirm', i, 'Destructive swipe actions must confirm (or offer undo) and name what is lost (core rule 2.8).', 'error');
      }
      const icon = block.text.match(/^\s*icon:\s*['"]?([\w-]+)/m)?.[1];
      if (icon && /pencil|edit|write/.test(icon))
        add('destructive-icon-mismatch', i, `Destructive action uses icon "${icon}"; use a delete icon such as trash (core rule 1.11).`);
      const color = block.text.match(/^\s*color:\s*['"]?([\w-]+)/m)?.[1];
      if (color && color !== 'negative')
        add('destructive-color', i, `Destructive action colour is "${color}"; use negative (core rule 1.7).`, 'info');
    }

    if (/^\s*-?\s*text:/.test(line)) {
      // Tag/label text that reads as a sync state, coloured negative in the same item.
      const window = lines.slice(i, i + 8);
      const colorAt = window.findIndex((l, k) => k > 0 && /^\s*color:/.test(l));
      if (colorAt > 0) {
        const textPart = window.slice(0, colorAt).join('\n');
        const colorPart = window.slice(colorAt, colorAt + 3).join('\n');
        if (SYNC_WORDS.test(textPart) && /negative/.test(colorPart))
          add('sync-state-negative', i, 'Waiting to sync is a normal state; colour it neutral and keep negative for failures (core rule 1.7).');
      }
    }

    if (/^\s*-?\s*type:\s*component\.number-field\b/.test(line)) {
      const block = blockOf(lines, i).text.split('\n');
      const def = block.findIndex((l) => NUMBER_DEFAULT.test(l));
      if (def >= 0 && !/isTextClearedOnFocus:\s*true/.test(block.join('\n')))
        add('prefilled-number-default', i + def, 'Number field starts with a fixed default; typing appends to it (1 + "2" = 12). Use isTextClearedOnFocus: true for defaults (core rule 4.9).', 'info');
    }

    if (/^\s*-\s*type:\s*action\.show-alert\b/.test(line)) {
      const block = blockOf(lines, i).text;
      if (/presentAs:\s*toast/.test(block) && /isNegative:\s*true/.test(block))
        add('error-in-toast', i, 'Errors the user must act on should stay on screen (banner/modal), not in a disappearing toast (core rule 3.8).', 'info');
    }
  });
  return findings;
}

function eachSource(root, fn) {
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith('.jigx')) fn(fs.readFileSync(full, 'utf8'), path.relative(root, full));
    }
  };
  visit(root);
}

export function lintSolution(root) {
  const findings = [];
  eachSource(root, (text, file) => findings.push(...lintSource(text, file)));
  return findings;
}

export function stringsOfSolution(root) {
  const seen = new Map();
  eachSource(root, (text, file) => {
    for (const s of collectStrings(text, file)) if (!seen.has(s.text)) seen.set(s.text, s);
  });
  return [...seen.values()].sort((a, b) => a.text.localeCompare(b.text));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    const asText = args.includes('--text');
    const root = args.find((a) => !a.startsWith('--')) || '.';
    if (args.includes('--strings')) {
      for (const s of stringsOfSolution(root)) console.log(`${s.text}\t${s.file}:${s.line}`);
      process.exit(0);
    }
    const findings = lintSolution(root);
    const count = (s) => findings.filter((f) => f.severity === s).length;
    if (asText) {
      for (const f of findings) console.log(`${f.severity.padEnd(7)} ${f.code.padEnd(34)} ${f.file}:${f.line}  ${f.message}`);
      console.log(`\n${count('error')} errors, ${count('warning')} warnings, ${count('info')} info`);
    } else {
      console.log(JSON.stringify({root, errors: count('error'), warnings: count('warning'), info: count('info'), findings,
        limits: 'Line-based heuristics only; review each finding. Does not prove device rendering or flow behaviour.'}, null, 2));
    }
    process.exitCode = count('error') ? 1 : 0;
  } catch (error) {
    console.error(`UX lint failed: ${error.message}`);
    process.exitCode = 2;
  }
}
