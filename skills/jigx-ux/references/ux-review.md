# UX Review Procedure

Use this procedure when asked to review, audit or "clean up the UX" of an existing Jigx
solution, or before a release.

## 1. Automated pass

Run the dependency-free UX lint over the solution source (the folder with `index.jigx`).
For a Core SDK (TypeScript) project, pass the project folder: the lint reads the build
output (build it first: `npm ci`, then `npx jigx build`, with the customer profile if
the repo has one) and names the `src/` file behind each finding. **Fix findings in
`src/`, never in `build/`.** The next build overwrites `build/`.

```sh
node skills/jigx-ux/scripts/ux-lint.mjs /path/to/solution --text
node --test skills/jigx-ux/scripts/ux-lint.test.mjs
```

It reports `error` / `warning` / `info` findings with `file:line` and the core rule.
The lint is line-based and only produces review prompts. Open each finding and decide.
It exits nonzero only for errors (destructive swipes without a confirm). The lint
follows a swipe into the shared actions it calls (`actions/<name>.jigx`). A confirm
that only runs in some cases (`when:`) doesn't count, and an action it can't find is
treated as not asking, so check it.

Some findings come marked **needs verification**: the source alone can't settle them,
because the answer depends on data or on where a value is set (buttons that swap by
state, forms whose fields save on change, error text set by the app). Check those in
the source or on a device before calling them confirmed.

On a large solution, review one area at a time: `--only jigs/<folder>` (comma
separated, or repeated) or `--flow <start screen>`, which follows the screens it opens,
its bottom sheets and the shared actions they call. Cross-file checks still read the
whole solution. Both flags work for `ux-lint.mjs` and `propose.mjs`.

| Code | What it suggests |
| --- | --- |
| `missing-title` | Full screen without a title |
| `missing-header` | Full screen (list, menu, home or form) without a header image (a header with only buttons doesn't count). Skipped when every way into the screen is a modal (`isModal: true`) or another screen's bottom sheet. When no screen has one, it is proposed as one app-wide decision |
| `destructive-swipe-without-confirm` | Delete/Remove swipe with no "are you sure?", directly or in the shared actions it calls. Says when it deletes on the server |
| `destructive-icon-mismatch` / `destructive-color` | Delete shown with a pencil icon or a non-negative colour |
| `sync-state-negative` | "Not synced", "Pending ..." or "Edited" tag coloured red |
| `sync-tag-colours` | Sync tags that mean "waiting to upload" (Not synced, Edited, Pending ...) in different colours, or one tag in different colours on two screens. The proposal shows every sync tag with its colour. Colours set by an expression are listed but not compared |
| `discard-alert-off` | Discard warning hard-disabled on a form with typed fields. A form that saves only with a button is a warning (pop-ups too). When every typed field saves itself (`onChange`), it is info and needs verification. Filter and picker forms are skipped; forms embedded in a hub screen are usually intentional |
| `generic-copy` / `generic-label` | "Oops", "Something went wrong", OK/Submit/Yes/No. The proposal quotes each message and how often it appears, so one copied template shows up as one fix |
| `na-literal` | `'N/A'` possibly shown for a missing value. Not flagged when N/A is an answer option (`{"value":"N/A"}`) or a stored answer it is compared with |
| `hardcoded-date-format` | One-off date/time format instead of the shared one, including `$fromMillis` pictures and dates cut from ISO text (`$substringBefore(date, 'T')`). Also checks the scripts in `scripts/` (often PDFs and prints): `toLocaleDateString()`, fixed locales, hand-built dates |
| `email-in-text` | An email address in a message users see (usually a person's). The fix is a better message first, then the customer's helpdesk from a setting, not a Jigx or team address |
| `erp-wording` | ERP shorthand (`Svc.`, `Doc.`, `nbr.`), `' || '` separators or `<NEW>` placeholders in labels and values |
| `unused-part` | A component, function or shared action nothing in use refers to. Its other findings are left out; propose removing it as cleanup |
| `raw-error-text` / `raw-json` | Error value or stringified record shown to the user (an error used only in a condition, `.error ? "Error" : ...`, is not flagged). Errors from a response or the sync queue are system errors; errors set by the app (jig state, inputs, a component) need verification of where the text is written |
| `icon-from-data` | Icons from data. Not proposed: the icon-migration skill owns these (its fromData list) |
| `error-in-toast` | An error shown only in a disappearing toast |
| `too-many-actions` | More than two bottom buttons that can show at the same time. Buttons whose conditions rule each other out (`step=1` / `step=2`, or `X` and `$not(X)`, also through the jig's `expressions:`) are not counted together. A warning when two always show; when it depends on data, info and needs verification. Write the state table (`actions-layout.md`) |
| `custom-layout` | Custom component or hand-built layout. Compare with the native look on a device (`custom-components.md`) |
| `prefilled-number-default` | A number field with a fixed default that typing appends to (1 + "2" = 12). Hidden or disabled fields are skipped |

For spelling and wording, list every literal text the user can see and read it
through (typos, plurals, internal names, inconsistent terms):

```sh
node skills/jigx-ux/scripts/ux-lint.mjs /path/to/solution --strings
```

Run the icon check too, and handle its result as `icons.md` describes (run the
icon-migration skill, or give the user the steps):

```sh
node skills/jigx-ux/scripts/check-icons.mjs /path/to/solution
```

Also run the `jigx` runtime checker on the build output, as that skill describes. Hidden
action groups and undeclared state are UX defects too.

## 2. Manual searches

These are useful searches the lint doesn't cover. Run them from the solution root:

```sh
# Internal IDs or GUIDs bound to visible text
grep -rnE "(title|subtitle|description|value):\s*=.*\b(id|guid|uuid|_tmp)\b" . --include='*.jigx'
# Several refresh/sync buttons on one screen (core rule 5.6)
grep -rnc "action.sync-entities" . --include='*.jigx' | grep -v ':0$' | sort -t: -k2 -n | tail
# Success wording that may claim an upload (core rule 3.3)
grep -rniE "(uploaded|sent|synced|submitted) successfully" . --include='*.jigx'
# Placeholders that may never clear offline
grep -rn -A2 "icon: loading-data" . --include='*.jigx'
```

## 3. Walk the main journeys

Static checks can't see flows. When a simulator with the app is available, the agent
can walk it itself (`device-review.md`, `scripts/sim.sh`), including large text and
dark mode. Otherwise ask the user to do it. On a device or emulator, walk each main journey of the
solution (for example: open today's work, start, record lines/time/photos, complete,
sign, share, and sync), and check each of these:

1. **Orientation:** every screen has a title, context (which record), and an obvious
   next action.
2. **Taps:** count the taps for the most frequent task. Look for fields that could be
   defaulted and confirmations that aren't needed.
3. **Double tap:** tap each main action twice quickly. There should be one result.
4. **Interrupt:** leave mid-entry (back, home button, phone call), then return. Was
   input kept or a discard prompt shown? Was there a false prompt when nothing changed?
5. **Offline:** use airplane mode for the whole journey. Saves must work, state must be
   honest, online-only features must be announced, and no endless spinners.
6. **Errors:** trigger a validation error and a sync failure. Messages must be in
   plain words, at the field or record, with a way to fix.
7. **Empty:** a new user with no data sees explanatory empty states.
8. **Consistency:** the same thing has the same name, icon, colour and tag everywhere.
   Dates and money use one format.
9. **Reach and size:** the main actions are in the bottom panel, rows are fully
   tappable, destructive actions are separated.
10. **Back:** the Android back gesture and iOS swipe-back never exit the app or lose
    work unexpectedly.

## 4. Severity

| Severity | Meaning | Examples |
| --- | --- | --- |
| Critical | Data loss, wrong data, or a user trapped | Discard loses saved work, double-tap duplicates, blocked with no way out, false "Uploaded" |
| High | The task fails or is seriously misleading | Silent Save, disabled action with no reason, raw error shown, false Offline |
| Medium | Slows or confuses repeated work | Missing defaults, duplicate actions, inconsistent terms or colours, red "waiting to sync" |
| Low | Polish | Header image missing, capitalisation, typo, sort order |

## 5. Output: proposals for the owner

A review never changes the solution. Its output is a proposals list that the owner
approves (`change-proposals.md`):

1. Draft with `node skills/jigx-ux/scripts/propose.mjs /path/to/solution`. It writes to
   `~/jigx-ux-reviews/<solution>/<branch>/ux-proposals.md`, outside the repo (with
   `--only`/`--flow`, the file name says the scope).
2. **Triage before the owner sees it.** Open each place in the source and replace
   "not checked yet" with **confirmed**, **intentional** (with the reason; take it out
   of the fix) or **needs verification** (the source can't settle it: say what to check on a device, or add a "Decision needed" line). Drop a proposal when every
   place is intentional, raise or lower its severity when the source shows a different
   risk (for example a delete that goes to the server is High), and narrow the fix to
   the real problem (quote the message that has to change). The lint's severity is
   only a starting point: set the final one from the severity table above. Most
   findings from reading the screens (wrong sync colours, actions greyed out with no
   reason, ERP wording, placeholders shown as values) are Medium, not Low.
3. Add walkthrough findings under "Manual findings", using the severity table above.
4. Hand the file to the owner, and implement only what they approve.

- Separate generic findings (fix in the shared solution) from customer-specific ones
  (documented in the customer's own rules, not in this skill).
- Note anything you could not verify on a device as "not verified on device".
- Don't propose deleting shared behaviour that other customers use. Propose a config
  flag (core rule 2.2).
