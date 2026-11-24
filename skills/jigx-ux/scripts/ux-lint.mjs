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
const GENERIC_COPY = /\b(oops|something went wrong|an error occurred|error occurred|screenshot and email)\b/i;
const GENERIC_BUTTON = /^\s*(title|confirm|cancel):\s*['"]?(ok|submit|yes|no)['"]?\s*$/i;
const NA_LITERAL = /'N\/A'|"N\/A"/;
// N/A as a choice (`{"value":"N/A"}`, `value: N/A`) or a stored answer compared against.
const NA_ANSWER = /["']?(value|label|id)["']?\s*:\s*["']N\/A["']|[\w)\]'"]\s*!?=\s*["']N\/A["']|["']N\/A["']\s*!?=\s*[\w@$(]/;
const DATE_FORMAT = /^\s*format:\s*['"]?[^'"\n{]*(YYYY|DD[./-]|MM[./-]|HH:mm|hh:mm)/;
const DATE_PICTURE = /\$fromMillis\(.*,\s*['"]\[[A-Za-z]/;
// A date cut out of an ISO string ("2026-11-24T10:00" -> "2026-11-24") shows the raw format.
// Dates formatted in expression scripts (often PDFs and prints): the phone's own format, a
// fixed locale, or a date built by hand. Money (`number.toLocaleString`) is left alone.
const SCRIPT_DATE = /toLocale(Date|Time)String\(|Intl\.DateTimeFormat|new Date\([^)]*\)\.toLocaleString\(|toLocaleString\([^)]*(dateStyle|timeStyle|weekday|month:)|\.format\(\s*['"][^'"]*(YYYY|DD|MM)/;
const ISO_SLICE = /\$substringBefore\([^,]+,\s*['"]T['"]\)|\$substring\([^,]*date[^,]*,\s*0\s*,\s*10\)/i;
const SYNC_WORDS = /\b(local|not synced|unsynced|pending|waiting to sync|edited|offline)\b/i;
const EMAIL = /[\w.+-]+@(?!ctx\.)[\w-]+(\.[\w-]+)*\.[a-z]{2,}\b/i;
// ERP shorthand and internal placeholders in labels: "Svc. Doc.", "nbr.", " || ", "<NEW>".
const ERP_WORDING = /\b(nbr|svc|doc|desc|ref|cd)\.(?=[\s'"]|$)|['"]\s*\|\|\s*['"]|<NEW>/i;
const RAW_ERROR = /^\s*(title|subtitle|description|text|value):\s*=.*\.(errorMessage|error|exception|stack|responseBody|response)\b/;
const RAW_JSON = /^\s*(title|subtitle|description|text|value):\s*=\s*\$string\(@ctx\.(current\.item|datasources\.[\w-]+)\)\s*$/;
const DATA_ICON = /^\s*icon:\s*['"]?=.*@ctx\.(current\.item|datasources)/;
const NUMBER_DEFAULT = /^\s*initialValue:\s*['"]?-?\d+(\.\d+)?['"]?\s*$/;
const STRING_KEYS = /^\s*-?\s*(title|label|subtitle|description|text|confirm|cancel|helperText|placeholder):\s*(.+)$/;

const TYPED_FIELD = /type:\s*component\.(text-field|number-field|email-field|signature-field|text-area)\b/;
const SERVER_CALL = /rest-delete|call-function|function:\s*['"]?rest-/i;

const cleanTitle = (value) => value.trim().replace(/^['"]|['"]$/g, '').replace(/^\|$/, '').trim();

// The bottom action groups of a jig: top-level `actions:` -> `- children:` -> `- type: action.*`.
// Returns each group's buttons with their title and whether they are only shown in some states.
export function bottomActions(lines) {
  const exprs = jigExpressions(lines);
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
      const own = (key, ind) => {
        const w = b.findIndex((l) => indentOf(l) === ind && new RegExp(`^\\s*${key}:`).test(l));
        if (w < 0) return null;
        let expr = b[w].replace(new RegExp(`^\\s*${key}:\\s*`), '');
        for (let n = w + 1; n < b.length && indentOf(b[n]) > ind; n++) expr += ` ${b[n].trim()}`;
        return expr.replace(/^[|>]-?\s*/, '').replace(/^=/, '').trim();
      };
      const when = own('when', c + 2);
      const hidden = own('isHidden', c + 4);
      const shownIf = shownConditions(when, hidden, exprs);
      buttons.push({line: k, title: title || lines[k].trim().replace(/^-\s*type:\s*/, ''), conditional: shownIf !== null, shownIf});
    }
    const before = lines.slice(block.start, i).reverse().find((l) => /numberOfVisibleActions:/.test(l));
    const visible = before ? Number(before.match(/numberOfVisibleActions:\s*(\d+)/)?.[1]) : undefined;
    groups.push({line: i, visible, buttons});
  }
  return groups;
}

// Split a condition on a top-level `and` / `or` (outside brackets and quotes).
function splitTop(expr, word) {
  const parts = [];
  let depth = 0, from = 0, quote = null;
  const sep = new RegExp(`^\\s${word}\\s`);
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0 && sep.test(expr.slice(i, i + word.length + 2))) {
      parts.push(expr.slice(from, i).trim());
      from = i + word.length + 2;
    }
  }
  parts.push(expr.slice(from).trim());
  return parts;
}

// The inside of `prefix(...)` when the brackets wrap the whole text.
function wrapped(s, prefix = '') {
  if (!s.startsWith(`${prefix}(`) || !s.endsWith(')')) return null;
  let depth = 0;
  for (let i = prefix.length; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')' && --depth === 0 && i < s.length - 1) return null;
  }
  return s.slice(prefix.length + 1, -1);
}

// Whitespace and outer brackets removed, `$not($not(X))` -> X, so equal conditions compare equal.
function normCond(c) {
  let s = c.replace(/\s+/g, '');
  for (let k = 0; k < 6; k++) {
    const inner = wrapped(s);
    if (inner !== null) { s = inner; continue; }
    const not = wrapped(s, '$not');
    const twice = not !== null ? wrapped(normCond(not), '$not') : null;
    if (twice !== null) { s = twice; continue; }
    if (not !== null) { s = `$not(${normCond(not)})`; break; }
    break;
  }
  return s;
}

// The parts of a condition joined by a top-level `and` (none when it has a top-level `or`).
function conjuncts(expr) {
  if (splitTop(expr, 'or').length > 1) return [];
  return splitTop(expr, 'and').map(normCond);
}

// What must be true for a button to show, from `when` or from `isHidden` (`A or B` hidden
// means `$not(A)` and `$not(B)` shown). Jig-level `@ctx.expressions.x` are filled in.
function shownConditions(when, hidden, exprs) {
  const fill = (e) => {
    for (let k = 0; k < 3; k++) e = e.replace(/@ctx\.expressions\.([\w-]+)/g, (m, name) => (exprs.has(name) ? `(${exprs.get(name)})` : m));
    return e;
  };
  if (when) return conjuncts(fill(when));
  if (!hidden) return null;
  const h = fill(hidden);
  const inner = wrapped(h.replace(/\s+/g, ''), '$not');
  if (inner !== null) return conjuncts(inner);
  return splitTop(h, 'or').map((part) => normCond(`$not(${part})`));
}

// Jig-level `expressions:` (name -> expression without the leading =).
function jigExpressions(lines) {
  const map = new Map();
  const top = lines.findIndex((l) => /^expressions:\s*$/.test(l));
  if (top < 0) return map;
  const block = blockOf(lines, top);
  for (let i = top + 1; i < block.end; i++) {
    const m = lines[i].match(/^ {2}([\w-]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2];
    for (let n = i + 1; n < block.end && indentOf(lines[n]) > 2; n++) value += ` ${lines[n].trim()}`;
    map.set(m[1], value.replace(/^[|>]-?\s*/, '').replace(/^=/, '').trim());
  }
  return map;
}

// Two buttons can't show together when their conditions need different values of the same
// thing (`step=1` and `step=2`, `step>1` and `step=1`), or `X` and `$not(X)`.
function exclusive(ca, cb) {
  if (!ca?.length || !cb?.length) return false;
  const cmp = (c) => c.match(/^(.+?)(>=|<=|!=|=|>|<)(['"]?[\w.-]+['"]?)$/);
  for (const x of ca) for (const y of cb) {
    if (x === `$not(${y})` || y === `$not(${x})`) return true;
    const p = cmp(x), q = cmp(y);
    if (!p || !q || p[1] !== q[1]) continue;
    const [, , op1, v1] = p, [, , op2, v2] = q;
    if (op1 === '=' && op2 === '=' && v1 !== v2) return true;
    const n1 = Number(v1), n2 = Number(v2);
    if (Number.isNaN(n1) || Number.isNaN(n2)) continue;
    const ok = (op, v, n) => ({'=': n === v, '>': n > v, '<': n < v, '>=': n >= v, '<=': n <= v, '!=': n !== v})[op];
    if (op1 === '=' && !ok(op2, n2, n1)) return true;
    if (op2 === '=' && !ok(op1, n1, n2)) return true;
  }
  return false;
}

// The most buttons of a group that could show at the same time, by the conditions the lint can read.
export function mostShownTogether(buttons) {
  if (buttons.length > 16) return buttons.length;
  let best = 0;
  for (let mask = 1; mask < 1 << buttons.length; mask++) {
    const pick = buttons.filter((_, i) => mask & (1 << i));
    if (pick.length <= best) continue;
    if (pick.every((x, i) => pick.slice(i + 1).every((y) => !exclusive(x.shownIf, y.shownIf)))) best = pick.length;
  }
  return best;
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

// True when the text has an action.confirm that always runs (no `when:` on it).
export function hasUnconditionalConfirm(text) {
  const lines = text.split(/\r?\n/);
  return lines.some((line, i) => {
    if (!/type:\s*action\.confirm\b/.test(line)) return false;
    let start = i;
    if (!/^\s*-\s/.test(line)) while (start > 0 && !(indentOf(lines[start]) < indentOf(line) && /^\s*-\s/.test(lines[start]))) start--;
    const item = blockOf(lines, start).text.split('\n');
    const keyIndent = indentOf(lines[start]) + 2;
    return !item.some((l, k) => (k === 0 ? /^\s*-\s*when:/.test(l) : indentOf(l) === keyIndent && /^\s*when:/.test(l)));
  });
}

// A header with an image (a header can also just hold buttons).
function hasHeaderImage(text) {
  const lines = text.split(/\r?\n/);
  const top = lines.findIndex((l) => /^header:/.test(l));
  return top >= 0 && /component\.image\b|\buri:|\bsource:/.test(blockOf(lines, top).text);
}

const jigName = (file) => path.basename(file).replace(/\.jigx$/, '');

// Cross-file facts the line checks need: shared actions by name, and jigs that are only
// ever opened as a modal (every go-to that links to them sets isModal: true) or in a bottom sheet.
export function solutionContext(files, extra = []) {
  const actions = new Map();
  const links = new Map();
  for (const {file, text} of files) {
    if (/(^|\/)actions\//.test(file)) actions.set(jigName(file), text);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, k) => {
      const target = line.match(/^\s*linkTo:\s*['"]?([\w-]+)['"]?\s*$/)?.[1];
      if (!target) return;
      const ind = indentOf(line);
      const siblings = [];
      for (let u = k - 1; u >= 0 && (lines[u].trim() === '' || indentOf(lines[u]) >= ind); u--) if (indentOf(lines[u]) === ind) siblings.push(lines[u]);
      for (let d = k + 1; d < lines.length && (lines[d].trim() === '' || indentOf(lines[d]) >= ind); d++) if (indentOf(lines[d]) === ind) siblings.push(lines[d]);
      const l = links.get(target) ?? {all: 0, modal: 0};
      l.all++;
      if (siblings.some((x) => /^\s*isModal:\s*true\b/.test(x))) l.modal++;
      links.set(target, l);
    });
    // Screens shown inside another screen's bottom sheet count as modal too.
    const sheet = lines.findIndex((l) => /^bottomSheet:\s*$/.test(l));
    if (sheet >= 0) for (const m of blockOf(lines, sheet).text.matchAll(/^\s*-?\s*(?:jigId|initialValue):\s*['"]?([\w-]+)['"]?\s*$/gm)) {
      const l = links.get(m[1]) ?? {all: 0, modal: 0};
      l.all++;
      l.modal++;
      links.set(m[1], l);
    }
  }
  const modalOnly = new Set([...links].filter(([, l]) => l.all > 0 && l.modal === l.all).map(([name]) => name));
  const anyHeader = files.some(({file, text}) => /(^|\/)jigs\//.test(file) && hasHeaderImage(text));
  return {actions, modalOnly, anyHeader, unused: unusedFiles(files, extra)};
}

const SHARED_PART = /(^|\/)(components|functions|actions)\//;

// Components, functions and shared actions that nothing in use refers to (dead code). Screens,
// datasources, index.jigx and any non-YAML files (`extra`, e.g. scripts) count as in use.
export function unusedFiles(files, extra = []) {
  const byName = new Map();
  for (const f of files) if (SHARED_PART.test(f.file)) byName.set(jigName(f.file), [...(byName.get(jigName(f.file)) ?? []), f]);
  const used = new Set();
  const queue = [...files.filter((f) => !SHARED_PART.test(f.file)), ...extra];
  while (queue.length) {
    const f = queue.shift();
    const self = f.file ? jigName(f.file) : null;
    for (const token of new Set(f.text.replace(/^\s*#.*$/gm, '').match(/[\w-]+/g) ?? [])) {
      if (token === self || used.has(token) || !byName.has(token)) continue;
      used.add(token);
      queue.push(...byName.get(token));
    }
  }
  return new Set(files.filter((f) => SHARED_PART.test(f.file) && !used.has(jigName(f.file))).map((f) => f.file));
}

// An error value used only in a condition (`.error ? "Error" : ...`) is not shown to the user.
function rendersErrorValue(line) {
  const expr = line.replace(/^\s*\w+:\s*=/, '');
  const refs = /\.(errorMessage|error|exception|stack|responseBody|response)\b(?!\s*(\?|=|!=|<|>|\band\b|\bor\b))/g;
  return [...expr.matchAll(refs)].some((m) => !/\$(exists|boolean|not)\([^)]*$/.test(expr.slice(0, m.index)));
}

// The message text, plus the description right under a title, so a proposal can quote it.
function excerptOf(lines, i) {
  const value = (l) => cleanTitle(l.replace(/^\s*-?\s*[\w-]+:\s*/, '')).replace(/^"|"$/g, '').replace(/\s+/g, ' ');
  let text = value(lines[i]);
  if (/^\s*-?\s*title:/.test(lines[i])) {
    const d = lines.slice(i + 1, i + 4).findIndex((l) => indentOf(l) === indentOf(lines[i]) && /^\s*description:/.test(l));
    if (d >= 0) {
      const at = i + 1 + d;
      const desc = /:\s*[|>]-?\s*$/.test(lines[at]) ? value(`x: ${lines[at + 1] ?? ''}`) : value(lines[at]);
      if (desc) text += ` / ${desc}`;
    }
  }
  return text.length > 110 ? `${text.slice(0, 107)}...` : text;
}

export function lintSource(text, file = '<source>', ctx = {}) {
  ctx = {actions: new Map(), modalOnly: new Set(), anyHeader: true, unused: new Set(), ...ctx};
  const findings = [];
  const lines = text.split(/\r?\n/);
  const add = (code, index, message, severity = 'warning', extra = {}) =>
    findings.push({severity, code, file, line: index + 1, message, ...extra});
  const isModalOnly = ctx.modalOnly.has(jigName(file));

  const jigType = text.match(/^type:\s*(jig\.[\w-]+)/m)?.[1];
  if (jigType) {
    if (!/^title:/m.test(text)) add('missing-title', 0, 'Full screens need a title naming what the user sees (core rule 1.1).');
    // Full screens (lists, menus, home, forms) get one; bottom sheets and pop-ups don't.
    if (/^jig\.(default|list)$/.test(jigType) && !hasHeaderImage(text) && !isModalOnly)
      add('missing-header', 0, ctx.anyHeader ? 'Full screen without the small header image other screens have (core rule 1.2).'
        : 'No screen in the app has a header image; decide once for the whole app whether full screens get one (core rule 1.2).', 'info', ctx.anyHeader ? {} : {appWide: true});
  }

  for (const group of bottomActions(lines)) {
    const n = group.buttons.length;
    if (n <= 2) continue;
    // Count what can show at the same time, not what is defined: most screens swap buttons by state.
    const always = group.buttons.filter((b) => !b.conditional).length;
    const together = mostShownTogether(group.buttons);
    if (together <= 2) continue;
    const names = group.buttons.map((b) => `${b.title}${b.conditional ? ' (some states)' : ''}`).join(', ');
    const overflow = group.visible !== undefined && together > group.visible ? ` Past ${group.visible}, the rest go behind the three-dots menu.` : '';
    if (always >= 2)
      // Two always show, so any conditional one makes three: no data needed to know that.
      add('too-many-actions', group.line, `${n} bottom actions: ${names}. ${always} always shown, so up to ${together} show at once.${overflow} Show at most 2 per state; move the rest (actions-layout.md, core rule 2.12).`);
    else
      add('too-many-actions', group.line, `${n} bottom actions are defined (${names}), each only in some states; from their conditions the lint can't rule out more than 2 at once.${overflow} Show at most 2 per state (actions-layout.md, core rule 2.12).`, 'info',
        {verify: `which states show more than 2 of these buttons together (it depends on data)`});
  }

  if (/^\s*-?\s*type:\s*component\.custom-component\b/m.test(text) || /type:\s*component\.view\b[\s\S]*type:\s*component\.text\b/.test(text)) {
    const at = lines.findIndex((l) => /type:\s*component\.(custom-component|view)\b/.test(l));
    add('custom-layout', at, 'Custom component or hand-built layout; compare it with the native component for the same job on a device (custom-components.md, core rule 1.14).', 'info');
  }

  let dataIconReported = false;
  let lastGeneric = -10;
  lines.forEach((line, i) => {
    if (/^\s*#/.test(line)) return;

    if (/isDiscardChangesAlertEnabled:\s*false\b/.test(line)) {
      // Only forms where the user types something can lose input. Filter and picker forms are fine.
      let f = i;
      while (f > 0 && !(indentOf(lines[f]) < indentOf(line) && /type:\s*component\.form\b/.test(lines[f]))) f--;
      const form = /type:\s*component\.form\b/.test(lines[f]) ? blockOf(lines, f).text : text;
      if (TYPED_FIELD.test(form)) {
        // Fields that save themselves on change lose nothing on Back; only explicit-save forms do.
        const formLines = form.split('\n');
        const typed = formLines.map((l, k) => (TYPED_FIELD.test(l) ? k : -1)).filter((k) => k >= 0);
        const itemStart = (k) => { let u = k; while (u > 0 && !/^\s*-\s/.test(formLines[u])) u--; return u; };
        const autosave = typed.every((k) => /^\s*onChange:/m.test(blockOf(formLines, itemStart(k)).text));
        const where = isModalOnly ? ' (pop-up form)' : '';
        if (autosave)
          add('discard-alert-off', i, `Discard warning is off, but each typed field saves on change${where}, so Back should lose nothing (core rule 4.3).`, 'info',
            {verify: 'that every field change is saved (onChange) and nothing is lost on Back'});
        else
          add('discard-alert-off', i, `Discard warning is hard-disabled on a form that saves only with a button${where}; bind it to dirty state so edits are not lost on Back or a swipe down (core rule 4.3).`);
      }
    }

    if (GENERIC_COPY.test(line) && i - lastGeneric > 3 && (lastGeneric = i) >= 0)
      add('generic-copy', i, 'Say what happened and what to do, in neutral words (feedback-and-sync.md section 3).', 'warning', {excerpt: excerptOf(lines, i)});
    if (GENERIC_BUTTON.test(line))
      add('generic-label', i, 'Use a specific verb that names the outcome instead of OK/Submit/Yes/No (core rule 2.3).', 'info');

    if (NA_LITERAL.test(line) && !NA_ANSWER.test(line))
      add('na-literal', i, "If 'N/A' is shown for a missing value, hide the row instead (core rule 1.4). Ignore when it is a real answer option.", 'info');

    // Only dates users see: not in functions/actions/datasources, not variables (`$x :=`),
    // ERP fields (`TranDate:`) or ISO dates built for a query or the server.
    const forServer = /(^|\/)(functions|actions|datasources|databases)\//.test(file) || /:=/.test(line) || /^\s*-?\s*"?[A-Z]\w*"?\s*:/.test(line)
      || /['"]\[Y(0001)?\]-\[M01\]-\[D01\](T[^'"]*)?['"]|['"]\[M01\]-?\[Y0001\]['"]/.test(line);
    if (!forServer && (DATE_FORMAT.test(line) || DATE_PICTURE.test(line) || ISO_SLICE.test(line)))
      add('hardcoded-date-format', i, "Dates/times should follow the solution's shared display format (core rule 1.5).", 'warning');

    if (EMAIL.test(line) && (STRING_KEYS.test(line) || !/^\s*-?\s*[\w-]+:/.test(line)))
      add('email-in-text', i, "An email address is shown to users. Use a team support address or a support action, never a person's address (feedback-and-sync.md section 3).", 'warning', {excerpt: line.match(EMAIL)[0]});

    if (ERP_WORDING.test(line) && (STRING_KEYS.test(line) || /^\s*initialValue:/.test(line)) && !/[!=]=?\s*['"]<NEW>|<NEW>['"]\s*!?=/.test(line))
      add('erp-wording', i, 'ERP shorthand or an internal placeholder in text users see; use plain words (core rule 1.6).', 'info', {excerpt: excerptOf(lines, i)});

    if (RAW_ERROR.test(line) && rendersErrorValue(line)) {
      // From a response or the sync queue it is a system error. From jig state, inputs or a
      // component the app sets it, often with its own words: check where before proposing.
      const fromApp = /@ctx\.(jig\.state|jig\.inputs|inputs|components)\./.test(line) && !/@ctx\.(response|datasources)/.test(line);
      if (fromApp)
        add('raw-error-text', i, 'An error value set by the app (state, inputs or a component) is shown; fine when the app writes it in plain words, a problem when it carries a server error (core rule 3.6).', 'info',
          {verify: 'where the shown error text is set: plain words written in the app, or a server error passed through'});
      else
        add('raw-error-text', i, 'A server or sync error is shown as it is; show plain words and keep the technical text for support (core rule 3.6).', 'info');
    }
    if (RAW_JSON.test(line))
      add('raw-json', i, 'A whole record is stringified onto the screen; show user fields instead (core rule 1.6).');

    if (!dataIconReported && DATA_ICON.test(line)) {
      dataIconReported = true;
      add('icon-from-data', i, 'Icons come from data here; every possible value must be registered in assets/icons.jigx (core rule 1.3).', 'info');
    }

    if (DESTRUCTIVE_LABEL.test(line)) {
      const block = blockOf(lines, i);
      if (!hasUnconditionalConfirm(block.text)) {
        // Follow shared actions: the swipe is fine when one of them always asks first.
        const called = [...block.text.matchAll(/^\s*action:\s*['"]?([\w-]+)['"]?\s*$/gm)].map((m) => m[1]);
        const found = called.filter((name) => ctx.actions.has(name));
        const asks = found.some((name) => hasUnconditionalConfirm(ctx.actions.get(name)));
        if (!asks) {
          const server = SERVER_CALL.test(block.text) || found.some((name) => SERVER_CALL.test(ctx.actions.get(name))) ? ' It deletes on the server, so it cannot be undone.' : '';
          const missing = called.filter((name) => !ctx.actions.has(name));
          const via = called.length === 0 ? 'It runs at once.'
            : missing.length ? `It calls ${called.join(', ')}; ${missing.join(', ')} could not be found to check, so treat it as not asking until checked.`
            : `It calls ${called.join(', ')}, and none of them always asks first.`;
          add('destructive-swipe-without-confirm', i, `Delete swipe without an "are you sure?". ${via}${server} Confirm (or offer undo) and name what is lost (core rule 2.8).`, 'error');
        }
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
      // A hidden or disabled field is never typed in.
      if (def >= 0 && !/isTextClearedOnFocus:\s*true/.test(block.join('\n')) && !/^\s*(isHidden|isDisabled):\s*true\b/m.test(block.join('\n')))
        add('prefilled-number-default', i + def, 'Number field starts with a fixed default; typing appends to it (1 + "2" = 12). Use isTextClearedOnFocus: true for defaults (core rule 4.9).', 'info');
    }

    if (/^\s*-\s*type:\s*action\.show-alert\b/.test(line)) {
      const block = blockOf(lines, i).text;
      if (/presentAs:\s*toast/.test(block) && /isNegative:\s*true/.test(block))
        add('error-in-toast', i, 'Errors the user must act on should stay on screen (banner/modal), not in a disappearing toast (core rule 3.8).');
    }
  });
  return findings;
}

// Every sync-state tag in the app with its colour, sorted into "waiting" (uploads by itself)
// and "problem" (the user must act). A colour set by an expression is listed as `expr`.
const PROBLEM_WORDS = /\b(error|errors|failed|failure|needs correction|conflict|rejected)\b/i;
export function syncTags(files) {
  const tags = [];
  for (const {file, text} of files) {
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!/^\s*-?\s*text:/.test(line)) return;
      const window = lines.slice(i, i + 8);
      const colorAt = window.findIndex((l, k) => k > 0 && /^\s*-?\s*(color|text):/.test(l));
      if (colorAt < 0 || !/^\s*color:/.test(window[colorAt])) return;
      const value = window[colorAt].replace(/^\s*color:\s*/, '').replace(/^['"]|['"]\s*$/g, '').trim();
      const fixed = /^[\w-]+$/.test(value) ? value : null;
      for (const m of window.slice(0, colorAt).join('\n').matchAll(/'([^'\n]{2,30})'|"([^"\n]{2,30})"/g)) {
        const label = (m[1] ?? m[2]).trim();
        if (/^[a-z_]+$/.test(label)) continue; // a data value ('failed'), not the text shown
        const kind = PROBLEM_WORDS.test(label) ? 'problem' : SYNC_WORDS.test(label) && !/^(local|offline)$/i.test(label) ? 'waiting' : null;
        if (kind) tags.push({label, kind, color: fixed ?? 'set by an expression (check on a device)', fixed: !!fixed, file, line: i + 1});
      }
    });
  }
  return tags;
}

// Waiting tags should share one calm colour, and a tag should look the same on every screen.
// Only fixed colours are compared; colours set by an expression are listed in the table only.
export function syncTagFindings(tags) {
  const fixed = tags.filter((t) => t.fixed);
  const colours = new Set(fixed.filter((t) => t.kind === 'waiting').map((t) => t.color));
  const byLabel = new Map();
  for (const t of fixed) byLabel.set(t.label.toLowerCase(), new Set([...(byLabel.get(t.label.toLowerCase()) ?? []), t.color]));
  const table = [...new Map(tags.map((t) => [`${t.label.toLowerCase()}|${t.color}`, {label: t.label, kind: t.kind, color: t.color}])).values()];
  return fixed.filter((t) => (t.kind === 'waiting' && colours.size > 1) || byLabel.get(t.label.toLowerCase()).size > 1).map((t) => ({
    severity: 'warning', code: 'sync-tag-colours', file: t.file, line: t.line, tags: table,
    message: `Sync tag "${t.label}" is ${t.color}; ${byLabel.get(t.label.toLowerCase()).size > 1 ? `the same tag is ${[...byLabel.get(t.label.toLowerCase())].filter((c) => c !== t.color).join(', ')} elsewhere` : `other waiting tags use ${[...colours].filter((c) => c !== t.color).join(', ')}`}. Give all waiting tags one calm colour and keep red for problems (core rule 1.7).`}));
}

// Expression scripts (`scripts/**/*.js|mjs|ts`): only the date check applies, because they
// often build PDFs, prints and labels that must show dates like the screens do.
export function lintScript(text, file = '<script>') {
  if (/soap|rest|api|sync/i.test(path.basename(file))) return []; // builds server requests
  const findings = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;
    const utc = /timeZone:\s*['"]UTC['"]/.test(line) ? ' It also uses timeZone UTC: check that users see their own local time.' : '';
    if (SCRIPT_DATE.test(line)) findings.push({severity: 'warning', code: 'hardcoded-date-format', file, line: i + 1,
      message: `Date formatted in a script (often a PDF or print) with its own format${/toLocale\w*\(\s*\)/.test(line) ? ", taken from the phone's settings" : ''}. Use the same shared format as the screens (core rule 1.5).${utc}`});
    else if (/getMonth\(\)/.test(line) && /get(Date|FullYear)\(\)/.test(line) && /[\/.]\$\{|['"`][\/.]|[\/.]['"`]/.test(line)) findings.push({severity: 'info', code: 'hardcoded-date-format', file, line: i + 1,
      message: 'Date built by hand in a script. Use the same shared format as the screens (core rule 1.5).', verify: 'if this date is sent to the server and never shown, mark it intentional'});
  });
  return findings;
}

function scriptSources(root) {
  const out = [];
  const visit = (dir, inScripts) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (['node_modules', 'build', 'tests', 'test', '__tests__'].includes(entry.name) || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full, inScripts || entry.name === 'scripts');
      else if (inScripts && /\.(js|mjs|ts)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) out.push({text: fs.readFileSync(full, 'utf8'), file: path.relative(root, full)});
    }
  };
  visit(root, false);
  return out;
}

// Non-YAML files that may refer to functions or components (scripts, JSON config).
function extraSources(root) {
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'build') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(js|mjs|ts|json)$/.test(entry.name) && !/^package(-lock)?\.json$/.test(entry.name)) out.push({text: fs.readFileSync(full, 'utf8')});
    }
  };
  visit(root);
  return out;
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

// The files one flow touches: the start screen, every screen it opens (linkTo), and the
// shared actions they call, followed transitively.
export function flowFiles(files, start) {
  const byName = new Map(files.map((f) => [jigName(f.file), f]));
  if (!byName.has(start)) throw new Error(`no screen or action named "${start}" (use the file name without .jigx)`);
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const {text} = byName.get(queue.shift());
    const refs = [...text.matchAll(/^\s*-?\s*(?:linkTo|action|jigId):\s*['"]?([\w-]+)['"]?\s*$/gm)].map((m) => m[1]);
    for (const r of refs) if (byName.has(r) && !seen.has(r)) { seen.add(r); queue.push(r); }
  }
  return new Set([...seen].map((n) => byName.get(n).file));
}

// Lint a solution, optionally only part of it: `only` = folder or file prefixes
// (e.g. ['jigs/RentalTech']), `flow` = a start screen whose flow is followed.
// Cross-file checks always read the whole solution.
export function lintSolution(root, {only = [], flow} = {}) {
  const files = [];
  eachSource(root, (text, file) => files.push({text, file}));
  const ctx = solutionContext(files, extraSources(root));
  const inFlow = flow ? flowFiles(files, flow) : null;
  const norm = (x) => x.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
  const picked = files.filter(({file}) => (!inFlow || inFlow.has(file)) && (!only.length || only.some((o) => norm(file) === norm(o) || norm(file).startsWith(`${norm(o)}/`))));
  // Unused parts: no point reviewing their UX. Reported once each as a cleanup note.
  // Scripts: in scope by folder (`only`), or when a screen of the flow calls one of their functions.
  const flowText = inFlow ? picked.map((f) => f.text).join('\n') : '';
  const scripts = scriptSources(root).filter(({text, file}) => {
    if (inFlow) return [...text.matchAll(/export\s+(?:async\s+)?(?:function|const|let)\s+(\w+)/g)].some((m) => new RegExp(`\\b${m[1]}\\b`).test(flowText));
    return !only.length || only.some((o) => norm(file) === norm(o) || norm(file).startsWith(`${norm(o)}/`));
  });
  const picks = new Set(picked.map((f) => f.file));
  const tagFindings = syncTagFindings(syncTags(files.filter((f) => !ctx.unused.has(f.file)))).filter((f) => picks.has(f.file));
  return [...tagFindings, ...picked.flatMap(({text, file}) => (ctx.unused.has(file)
    ? [{severity: 'info', code: 'unused-part', file, line: 1, message: 'No screen, action or function in use refers to this file; remove it or leave it out of the review (cleanup).'}]
    : lintSource(text, file, ctx))), ...scripts.flatMap(({text, file}) => lintScript(text, file))];
}

const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

// Finds what to lint. A YAML solution is the folder with index.jigx. A Core SDK
// (TypeScript) project is linted on its build output, and findings are mapped back to
// the src/ file that generates them: build/ is regenerated, so never fix it there.
export function resolveSolution(dir) {
  dir = path.resolve(dir);
  if (fs.existsSync(path.join(dir, 'index.jigx'))) return {root: dir, kind: 'yaml', project: dir};
  const pkg = readJson(path.join(dir, 'package.json'));
  const deps = pkg ? Object.keys({...pkg.dependencies, ...pkg.devDependencies}) : [];
  if (deps.some((d) => d.startsWith('@jigx/')) || fs.existsSync(path.join(dir, 'src')) && pkg) {
    const candidates = [];
    const look = (d, depth) => {
      if (!fs.existsSync(d) || depth > 3) return;
      if (fs.existsSync(path.join(d, 'index.jigx'))) candidates.push(d);
      for (const e of fs.readdirSync(d, {withFileTypes: true})) if (e.isDirectory() && e.name !== 'node_modules') look(path.join(d, e.name), depth + 1);
    };
    look(path.join(dir, 'build'), 0);
    if (!candidates.length)
      throw new Error(`${dir} is a Core SDK (TypeScript) project with no build output. Build it first (npm ci, then npx jigx build; set the customer profile if the repo has one, e.g. CUSTOMER=base), then run this again on the project folder.`);
    return {root: candidates[0], kind: 'sdk', project: dir};
  }
  throw new Error(`no index.jigx in ${dir}; pass the solution folder (or a Core SDK project folder)`);
}

// For SDK projects: the src/ file most likely to generate a build file (same base name,
// or the one file that mentions its name).
export function sourceMapper(project) {
  const src = path.join(project, 'src');
  const ts = [];
  const visit = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, {withFileTypes: true})) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) visit(full);
      else if (/\.(ts|tsx|js)$/.test(e.name)) ts.push(full);
    }
  };
  visit(src);
  const cache = new Map();
  return (buildFile) => {
    const name = jigName(buildFile);
    if (cache.has(name)) return cache.get(name);
    let hit = ts.find((f) => path.basename(f).replace(/\.(ts|tsx|js)$/, '') === name);
    if (!hit) {
      const mentions = ts.filter((f) => fs.readFileSync(f, 'utf8').includes(`'${name}'`) || fs.readFileSync(f, 'utf8').includes(`"${name}"`));
      if (mentions.length === 1) hit = mentions[0];
    }
    const rel = hit ? path.relative(project, hit) : null;
    cache.set(name, rel);
    return rel;
  };
}

// Shared CLI flags: --only <folder>[,<folder>] (repeatable) and --flow <screen>.
export function scopeArgs(args) {
  const only = [];
  let flow;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--only') only.push(...(args[i + 1] ?? '').split(',').filter(Boolean));
    if (args[i] === '--flow') flow = args[i + 1];
  }
  const rest = args.filter((a, i) => !['--only', '--flow'].includes(a) && !['--only', '--flow'].includes(args[i - 1]));
  return {scope: {only, flow}, rest};
}

// Lint a YAML solution or an SDK project. SDK findings get `file` relative to the project
// (build/...) and `source` (src/...) when it can be found.
export function lintProject(dir, scope = {}) {
  const target = resolveSolution(dir);
  const findings = lintSolution(target.root, scope);
  if (target.kind === 'sdk') {
    const toSource = sourceMapper(target.project);
    const prefix = path.relative(target.project, target.root);
    for (const f of findings) {
      const source = toSource(f.file);
      f.file = path.join(prefix, f.file);
      if (source) f.source = source;
    }
  }
  return {target, findings};
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
    const {scope, rest: args} = scopeArgs(process.argv.slice(2));
    const asText = args.includes('--text');
    const root = args.find((a) => !a.startsWith('--')) || '.';
    if (args.includes('--strings')) {
      for (const s of stringsOfSolution(resolveSolution(root).root)) console.log(`${s.text}\t${s.file}:${s.line}`);
      process.exit(0);
    }
    const {target, findings} = lintProject(root, scope);
    if (target.kind === 'sdk') console.error(`Core SDK project: linted the build output in ${path.relative(process.cwd(), target.root) || '.'}. Fix findings in src/, never in build/.`);
    const count = (s) => findings.filter((f) => f.severity === s).length;
    if (asText) {
      for (const f of findings) console.log(`${f.severity.padEnd(7)} ${f.code.padEnd(34)} ${f.file}:${f.line}${f.source ? ` (from ${f.source})` : ''}  ${f.message}${f.verify ? ` [needs verification: ${f.verify}]` : ''}`);
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
