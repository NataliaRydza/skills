# Forms And Input

Every field costs the frontline user time and accuracy. Good Jigx forms ask for less,
default more, and never lose what was typed.

## 1. Ask for less

- **Start from the mobile job, not the ERP screen.** List the fields the user really
  needs to change in the field. Everything else is defaulted, derived or left to the
  web.
- **Never ask twice** (WCAG 3.3.7). Prefill from the record, the user, the location,
  today, the last entry and the parent choice.
- **Derive what can be computed:** totals, durations from start and end, codes from
  selections, prices from the price list.
- **Put the rarely-used fields in a collapsed section** (`isCollapsible`) or on a
  secondary screen, so the common path stays short.

## 2. Choose the field by the data

| Data | Component | Rules |
| --- | --- | --- |
| 2-5 options, switches a view | `component.segmented-control` | Not for form values that need Save. Use in headers and filters |
| 2-~6 options in a form | `component.choice-field` (radio-like) | All options visible. Don't preselect unless there is a true default |
| Many options, known list | `component.dropdown` with `isSearchable` | Title the user recognises, subtitle to disambiguate |
| Record from a large or synced table | Picker list screen (`jig.list`) or searchable dropdown | Recent first. See `lists-and-tables.md` |
| Yes / no, optional | `component.checkbox` | Set `isRequired: false` explicitly. Label states the true case |
| Whole number / quantity | `component.number-field` | Numeric keyboard, `minimum`/`maximum`. Use `stepper` for small counts |
| Money | `component.number-field` with currency `format` | Show currency. Default missing money to 0 for display |
| Date | `component.date-picker` (`mode: date`) | Offer today as default. Restrict range with `minimum`/`maximum` |
| Time / date-time | `component.date-picker` (`mode: time` / `datetime`) | Follow the solution's 12/24-hour setting |
| Duration | `component.duration-picker` or start/end times | Display as hours and minutes. See section 5 |
| Short text | `component.text-field` | Correct `keyboardType`. `maxLength` matching the ERP field |
| Notes | `component.text-field` with `isMultiline` / `textArea` | Optional unless the business requires it. Allows dictation |
| Email / phone | `component.email-field` / text-field with phone keyboard | Validate format on blur |
| Photo / file | `component.media-field` | `isMultiple` where several are normal. Show thumbnails |
| Signature | `component.signature-field` | Show who signs and what for, right above it |
| Barcode / serial | Scanner action (`action.open-scanner`) + text-field fallback | Scan fills the field. Typing is the fallback |

## 3. Labels, help and required fields

- **Labels sit above or on the field and stay visible.** A placeholder is a hint
  ("e.g. 12"), never the label.
- **Pick one required/optional convention per solution.** Jigx shows an
  "(optional)" marker by default (`isOptionalLabelHidden` hides it). When most fields
  are required, marking only the optional ones is clearest.
- **Use `helperText` for format or meaning** ("Hours on site, excluding travel"),
  not for repeating the label.
- **Keep field order natural:** the order in which the user knows the answers
  (customer, then location, then contact), top to bottom in one column.

## 4. Validation

- **Validate on leaving a field or on Save, not on every keystroke**, and never
  before the user has typed. Inline validation beats submit-only validation, and
  validating after the user leaves the field beats validating while they type.
- **Show the problem at the field** with `errorText`. For long forms, also show a
  short summary near the action ("2 fields need attention").
- **Write messages that fix the problem:** "Enter the quantity used" or "Quantity
  must be 999 or less", not "Invalid value". Use the field's label wording.
- **Explain a disabled Save.** If Save is disabled because the form is incomplete,
  say what is missing (helper or banner text) instead of a silent grey button.
  Hidden required fields are a defect.
- **Separate the layers:** field required, form valid, business-ready (can
  Complete), and sync-ready. Show each message where the user can act on it.
- **Validation never clears what the user typed.**

## 5. Dates, times, durations and numbers

- **One date and time format per solution**, driven by the shared display settings.
  Don't hard-code a format on one screen.
- **Relative dates help in lists:** "Today", "Tomorrow", "Yesterday", then the date.
  Use exact times in records.
- **Durations display as `1h 30m`** (or `1:30` if the business prefers it), not
  `1.5` on one screen and `1:30` on another. If decimal hours are stored, convert
  for display and accept both forms on input. Totals can differ slightly by rounding
  (20 min = 0.33 h), so round once, at one precision.
- **Times are compared at the precision shown** (minutes). An edit the user can see
  is never treated as "unchanged".
- **Quantities show no unnecessary decimals.** Money always shows its currency
  precision.

## 6. One form, sections, or a wizard

| Situation | Use |
| --- | --- |
| Frequent task, experienced users (daily log, time entry, line item) | One form, sections, defaults |
| Long record with distinct areas | Record workspace with tabs (`screen-patterns.md`) |
| Ordered work where each step is its own job (inspection, checklist) | Checklist list: each item opens its own screen, returning to the list (core rule 5.1) |
| Rare, branching, novice task (onboarding, setup) | Wizard / stepper: show steps, name the next step on the button, allow back and resume |

## 7. Save, drafts and discard

The core rules (section 4 of `ux-guidelines.md`) define the behaviour. Mechanics:

- **Save is enabled only when the form is valid and really changed**
  (`@ctx.components.<form>.state.isDirty` / `isValid`, or a content comparison).
- **Bind the discard warning to dirty state explicitly.** Set
  `isDiscardChangesAlertEnabled` on the form, or use `canGoBack` with a confirm on the
  jig. Never rely on the platform default. Turn it off before navigating away after
  a successful save.
- **Disable the action on tap** with a jig state flag, so a double tap can't save
  twice.
- **One acknowledgement per save,** and it must be true: "Saved. Will sync when
  online" when queued, "Uploaded" only after the remote write succeeded.
- **Long or interrupted entry (multi-photo batches, inspections) keeps a draft.**
  On return, a banner offers to Resume or Discard the draft, and the banner never
  flashes during a save or navigation.
- **Reset form or component state only after the save succeeds,** and when Discard
  is chosen.

## 8. Media, scanning and signatures

- **Allow several photos in one capture** where that is normal. Show thumbnails with
  the count, and let the user add a caption without opening another screen.
- **Never block saving because an upload is pending.** Save locally, and show
  per-file sync state ("Waiting to upload", "Upload failed: tap to retry").
- **Scanning:** a successful scan fills the field or adds the line immediately.
  Scanning the same item again increases the quantity, and a failed scan says what
  was read and offers manual entry.
- **Signature:** show the signer's name field and what they are signing (summary,
  total) right above the pad. Offer Clear. After signing, show the signature as
  read-only with a way to redo it if the flow allows.
