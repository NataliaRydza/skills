# UX Review Procedure

Use this procedure when asked to review, audit or "clean up the UX" of an existing Jigx
solution, or before a release.

## 1. Automated pass

Run the dependency-free UX lint over the solution source (the folder with `index.jigx`):

```sh
node skills/jigx-ux/scripts/ux-lint.mjs /path/to/solution --text
node --test skills/jigx-ux/scripts/ux-lint.test.mjs
```

It reports `error` / `warning` / `info` findings with `file:line` and the core rule.
The lint is line-based and only produces review prompts. Open each finding and decide.
It exits nonzero only for errors (destructive swipes without a confirm).

| Code | What it suggests |
| --- | --- |
| `missing-title` | Full screen without a title |
| `missing-header` | Default/list screen without a header image (ignore for sheets/modals) |
| `destructive-swipe-without-confirm` | Delete/Remove swipe runs immediately |
| `destructive-swipe-confirm-unverified` | Delete swipe calls a shared action. Check that it confirms |
| `destructive-icon-mismatch` / `destructive-color` | Delete shown with a pencil icon or a non-negative colour |
| `sync-state-negative` | "Local / not synced" tag coloured red |
| `discard-alert-off` | Discard warning hard-disabled on a form |
| `generic-copy` / `generic-label` | "Oops", "Something went wrong", OK/Submit/Yes/No |
| `na-literal` | `'N/A'` possibly shown for a missing value |
| `hardcoded-date-format` | One-off date/time format instead of the shared one |
| `raw-error-text` / `raw-json` | Error value or stringified record shown to the user |
| `icon-from-data` | Icons from data. Check that every value is registered |
| `error-in-toast` | An error shown only in a disappearing toast |

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
# Icons read from data tables (core rule 1.3)
grep -rn -F "'\$.icon'" . --include='*.jigx'
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

Static checks can't see flows. On a device or emulator, walk each main journey of the
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

1. Draft with `node skills/jigx-ux/scripts/propose.mjs /path/to/solution`.
2. Check each drafted proposal, and remove places that are intentional.
3. Add walkthrough findings under "Manual findings", using the severity table above.
4. Hand the file to the owner, and implement only what they approve.

- Separate generic findings (fix in the shared solution) from customer-specific ones
  (documented in the customer's own rules, not in this skill).
- Note anything you could not verify on a device as "not verified on device".
- Don't propose deleting shared behaviour that other customers use. Propose a config
  flag (core rule 2.2).
