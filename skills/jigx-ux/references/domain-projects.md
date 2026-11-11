# Domain Playbook: Projects And Project Hubs

This playbook is for "project central" style apps: one hub per project, used by
project managers, site supervisors and crews. Their jobs are to pick a project and see
what needs action, complete the daily log, create and close tasks or punch items, view
current documents and drawings offline, record project time and costs, approve, and
check budget against actual.

## 1. Screen structure

```text
Projects list          my projects: recent/favourite first, search by name/number/customer
  └─ Project hub       context header + actionable counts + tools
       ├─ Daily log    one per day: weather, crew, equipment, notes, photos
       ├─ Tasks / punch assigned to me first; status, due date, location
       ├─ Photos       capture first, tag to task/location later
       ├─ Documents    drawings, specs, versions, cached-for-offline indicator
       ├─ Time         project time entries (see domain-time-tracking.md)
       ├─ Costs        expenses/material receipts (see domain-expenses-approvals.md)
       ├─ Approvals    change orders, timesheets, expenses for this project
       └─ Budget       budget, committed, actual, variance
```

## 2. Projects list

- **Show only the user's projects** by default (assigned, recent, favourite), with a
  filter for "All active".
- **Rows show** project name (title), number · customer (subtitle), status tag, and
  an attention count or next due item ("2 overdue tasks").

## 3. Project hub

- **The hub shows actions, not just navigation.** Each tool row carries a count that
  calls for action: "Tasks: 3 assigned to you, 1 overdue", "Daily log: today not
  submitted", "Approvals: 2". Use the row description or a badge, and colour only what
  needs attention.
- **Tailor the hub by role.** Crews see Daily log, Tasks, Photos and Time. Managers also
  see Approvals, Budget and Change orders. Hide what the role doesn't use.
- **The header keeps the project context** on every screen opened from the hub
  (project number and name), so the user knows where an entry is going.
- **Photo capture is one tap** from the hub and from any task.

## 4. Daily log

- **Prefill it.** The date is today, the project comes from context, crew and equipment
  are copied from yesterday (editable), and weather is filled automatically if
  available.
- **Each section is added independently** (Crew, Equipment, Notes, Photos, Delays), so
  a supervisor can fill it through the day. The log is a saved draft until submitted.
- **A list of days** shows each day's status (Draft, Submitted, Approved) and highlights
  missing days with a `warning` tag.
- **Submitting confirms** with what will be sent, and an offline submit is labelled
  "Waiting to sync".

## 5. Tasks and punch items

- **Capture first, details later.** A new item starts from a photo or a title, and the
  assignee, due date and location can follow.
- **Rows show** title, location or area, assignee, due date (overdue in `warning`
  or `negative`) and status.
- **The status flow is short:** Open → In progress → Ready for review → Closed. The
  assignee can move it from mobile, and closing asks for a photo or a note when the
  business needs evidence.
- **History is visible** on the item (who changed what, when) so the user doesn't have
  to ask the office.
- **Items created offline** show a temporary label ("New item") until the number is
  assigned on sync.

## 6. Documents and drawings

- **Show the current version only by default**, with the version and date visible.
  Superseded versions are reachable but marked.
- **Show cached state** ("Available offline") and let the user choose what to keep
  offline when files are large.
- **Open PDFs directly** in the viewer, with no intermediate screen (core rule 5.3).

## 7. Budget and progress on mobile

- **Use a small set of numbers:** budget, committed, actual to date, remaining and
  variance (amount and %), plus percent complete if tracked. Use `component.summary` or
  a short entity list.
- **Status colour by threshold:** on track `positive`, at risk `warning`, over
  `negative`. Always show the number with it.
- **Cost codes as a list:** code and description (title), actual vs budget (right
  element), and over-budget lines tagged. Drill into a code for its transactions.
- **Show data freshness** ("As of last sync 07:30"), because budget figures come from
  the ERP.
- **Don't port the full cost report.** Mobile answers "are we OK, and where not?"

## 8. Approvals in a project

- Change orders, timesheets and expenses for the project appear in the project's
  Approvals tool, filtered from the global inbox (`domain-expenses-approvals.md`).
- **Change orders show** scope summary, amount, schedule impact and attachments
  before the Approve/Reject actions. Rejecting requires a comment.

## 9. Pitfalls

- Hubs that are only icon grids, so the user must open every tool to find work.
- Daily logs typed from scratch every day.
- Forms and attachments that take long to load. Keep heavy content off the first
  screen.
- Familiar flows changing often. Keep navigation stable between releases.
- Configuration (types, lists) done on mobile. Keep setup on the web, but make sure
  the lists sync to mobile.
