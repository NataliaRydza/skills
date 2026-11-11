# Screen Patterns

Choose the pattern first, then the jig type, then the components. Most Jigx apps need
only a handful of patterns, used consistently.

## 1. Pattern to jig type

| Pattern | Use for | Jig type | Notes |
| --- | --- | --- | --- |
| Home / hub | "My work today", entry to modules | `jig.default` (or `jig.list`) | Widgets or list rows with counts. See section 2 |
| List | Browsing and finding records | `jig.list` | `isSearchable`, `filter`, `onRefresh`, empty-state placeholder |
| Record workspace | One record with several areas | `jig.tabs` or `jig.default` with sections | Header context + summary + tabs. See section 3 |
| Form / editor | Create or edit one record | `jig.default` with `component.form` | Discard alert bound to dirty state |
| Picker | Choose one item from many | `jig.list` (`isSelectable`) or searchable `component.dropdown` | Recent first, search, subtitle that disambiguates |
| Document | PDF or HTML preview | `jig.document` | Share / Regenerate in the bottom panel |
| Calendar | Scheduled work by day | `jig.calendar` | Only dates in range are selectable |
| Long text / chat | Rich notes, AI chat | `jig.full-screen` | No header image |
| Step-by-step | Rare, branching, novice tasks | `jig.wizard` or a checklist list | Prefer a checklist for repeated work |

`jig.grid`, `jig.table` and `jig.wizard` exist in the SDK, but production solutions rarely
use them. Verify their rendering on the target app before you rely on them.

## 2. Home / hub

The home screen answers the question "what do I need to do now?" It is not a module
launcher.

- **Lead with today's work.** Show today's appointments, the running timer, or items
  waiting for me at the top. Module navigation comes below or in tabs.
- **Show counts that call for action**, not just labels. "3 appointments today",
  "2 timesheets to approve", "1 sync issue". Use `badge` on the jig or tab for
  counts that need attention.
- **Hide modules the user's role doesn't use**, with `when:` on tabs and rows. Don't
  show rows that lead to "not available".
- **Keep the bottom tabs to 3-5**, all of equal importance. Use tabs only for
  navigation, never for actions, and keep them visible.
- **Sync health goes on home.** Show a single, honest sync indicator (header action
  or row): offline, syncing, waiting to sync (n), or sync issues (n), with a way to
  open the details. See `feedback-and-sync.md`.
- **Keep it fast.** Home loads from local data. No remote calls are needed to
  render it.

## 3. Record workspace

Use this layout for an appointment, opportunity, project, order, or any record with
several areas.

```text
title            what the record is ("Appointment", or the customer name)
header           small header image (area-consistent)
context block    recognisable name, number, status tag, 2-4 key facts, one-tap contact/navigate
summary          (optional) one key figure: total, hours, progress
tabs/sections    most-used first: Overview | Lines | Time | Photos | Documents
bottom panel     the next step in the record's flow (Start / Complete / Submit)
```

- **The header keeps context.** Salesforce shows the first four compact-layout fields,
  and Fiori keeps a collapsed header to two lines on mobile. Pick the 2-4 facts the user
  uses to recognise the record and decide what to do (time window, customer, address,
  status, amount).
- **One main action follows the record's state.** Not started: Start. In progress:
  Complete. Completed: Share report. Don't show every state transition at once.
- **The most-used tab comes first**, and heavy content (charts, long sub-lists,
  attachments) stays off the first tab so it opens fast.
- **Related lists show counts** ("Photos (4)", "Lines (12)"), and the tab badge
  shows problems ("Errors (1)").
- **The errors tab only appears when there are errors** (`when:` on the tab where
  supported). Otherwise keep it last and give it an empty state.
- **Pass the record ID to every tab and child screen as an input**, following the
  `jigx` skill.

## 4. Dashboards and KPIs

- **One dashboard, one question** ("How is my week?", "How is this project
  doing?"). It fits on one screen and links to detail.
- **Use few numbers.** Three to five figures that someone acts on beat a wall of
  tiles. Each figure has a label, a unit and a comparison where it helps (target,
  last week).
- **Use bars and lines for comparison** (`component.bar-chart`,
  `component.line-chart`). Avoid pie charts for more than 2-3 parts, and never use 3D
  or gauge-style charts for precise values.
- **Colour shows status, not magnitude.** Green means on track, orange means at
  risk, red means over. Always pair it with the number and text.
- **Say how fresh the data is** when a figure comes from the last sync ("As of
  09:40").
- **Keep summaries on records small:** `component.summary` with one total (order
  value, hours, progress) at the bottom of the record.

## 5. Loading, empty, offline and error states

Every list and record screen must handle all four states. Each one looks different.

| State | What to show |
| --- | --- |
| Loading | Placeholder with a specific title ("Loading appointments"), only while it really loads |
| Empty | Why it is empty + what to do ("No photos yet. Tap Add to take one.") |
| Empty because of filter/search | "No results for 'pump'." and a way to clear the filter |
| Offline, data not cached | "This needs a connection. Connect and pull to refresh." Not a spinner |
| Error | What failed in plain words + next step. Never raw JSON |

Never show "No records" while data is still loading, and never show "Loading" forever
when the device is offline.

## 6. Navigation flow

- **Go back where the user expects.** After saving a child, return to the parent.
  After finishing a checklist step, return to the checklist while steps remain (core
  rule 5.1).
- **Don't stack duplicate screens.** Opening the same record twice must not build a
  deep back stack. Use `go-back` after a save, not `go-to` the parent again.
- **Deep links out of the app** (maps, phone, email) use `action.open-map` /
  `action.open-url` with `tel:` or `mailto:`, and the user comes back to the same place.
- **The Back gesture must never exit the app unexpectedly** from a detail screen.
  Check the Android bottom-edge back gesture on the main flows.
- **Don't show a home button** on deep screens unless the flow really needs it.
  Users rely on Back.
