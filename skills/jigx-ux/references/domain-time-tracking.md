# Domain Playbook: Time Tracking

This playbook is for time logs, time cards, timesheets and timers. The user's jobs are
to clock in and out or run a timer against the right work, switch work or take a break
without losing time, fix forgotten or wrong entries, check today's and the week's
totals, and submit for approval. Approvers review, approve or return.

## 1. Screen structure

```text
Home / Time
  ├─ Running timer bar      work item, elapsed time, Stop | Switch | Break
  ├─ Today                  entries for today + today's total
  └─ Week                   one row per day (hours on the right) + week total vs expected
       └─ Day               entries for the day → entry editor
Entry editor               work item (project/task/cost code or appointment), start/end or duration, type, notes
Submit week                summary → confirm → Submitted (locked or pending)
Approvals (manager)        see domain-expenses-approvals.md
```

## 2. The running timer

- **Show the running timer prominently** on the time home and on the record it belongs
  to (appointment, project task), and as a home indicator. The user must never wonder
  whether a timer is running.
- **The timer shows** what it's running against and the elapsed time in hours and
  minutes, with Stop as the main action.
- **Start a timer from the work itself** (appointment Start, project task) so the
  entry is linked automatically, with no re-entering of project or task.
- **Switch job is one atomic action.** It ends the current entry and starts the next
  at the same timestamp. A break works the same way. No gaps, no overlaps.
- **Forgotten timers:** when a timer has run longer than a sensible limit, flag it
  on home ("Timer running 11h 20m. Still working?") with Stop at a chosen time. Never
  stop it silently.
- **Location or geofence prompts suggest; they don't decide.** Ask "Clock in at
  site?" rather than clocking in automatically.

## 3. Manual entry and editing

- **Default everything:** today's date, the current user, the last-used work item
  (or the current record), start = end of the previous entry.
- **Work-item pickers show Recent and Favourites first**, then search. Project, task
  and cost code cascade, and a changed parent clears the dependent choice with a note.
- **Use one duration convention.** Either start and end times (the duration is
  derived and shown) or a duration picker. Display as `1h 30m`. If the ERP stores
  decimal hours, convert for display and round once.
- **Earning type, billable flag and overtime** are defaulted from rules, and only
  shown when the user can and should change them.
- **Notes are optional** unless the business requires them. If required, say so in
  the label, not after Save.

## 4. Validation

- **Overlaps:** on Save, if the entry overlaps another, show the conflicting entry
  and offer to adjust it. Don't accept it silently, and don't fail without saying which
  entry.
- **Future times or entries on locked days** are blocked at the field, with the reason.
- **Unusually long entries** (over 12h) get a warning, not a block.
- **Submitting a week with a running timer, overlaps or missing days** lists the
  problems with links to each day.

## 5. Totals and the week view

- **Today's total and the week total are always visible** on the time home, and the
  week total is compared to expected hours ("32h 15m of 40h").
- **The week is a list, not a grid.** One row per day: day and date (title), the
  number of entries or projects (subtitle), and the hours (right element). Highlight
  missing days with a `warning` tag. Tap a row to open the day.
- **Break out regular, overtime and break time** in the summary when the business
  pays them differently.
- **Totals use the same rounding** in every view, so mobile and web agree.

## 6. Approval and locking

- **The period status is visible** on the week: Draft, Submitted, Approved, Returned.
  Use the shared tag vocabulary.
- **Submit asks for confirmation** with the totals ("Submit 38h 30m for 3-9 Nov?"),
  because it changes who owns the record.
- **Approved or locked entries are visibly read-only** (a lock icon, and the reason in
  the subtitle). Edit actions are hidden, not just failing.
- **Returned timesheets show the approver's comment** at the top, and the entries
  that need changes are marked.
- **Submissions made offline** show "Submitted. Waiting to sync", not "Approved" or
  "Sent".

## 7. Lists and fields to surface

| Where | Fields |
| --- | --- |
| Entry row | Work item (title), start-end or type (subtitle), duration (right), sync/lock tag |
| Day row | Day + date, entries count, total hours, missing/overtime tag |
| Week header/summary | Week total vs expected, overtime, period status |
| Running timer | Work item, elapsed time, Stop/Switch |

## 8. Pitfalls

- A hidden running timer leads to inflated or forgotten time.
- Re-entering the project, task and cost code on every entry.
- Decimal on one screen and hh:mm on another, with totals that don't match the web.
- A break or switch done on mobile doesn't appear on the web because it wasn't
  synced. Show sync state on the entries.
- End-of-week reconstruction. Nudge daily: an empty yesterday shows a warning on the
  time home.
