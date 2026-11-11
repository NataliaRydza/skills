# Domain Playbook: Expenses And Approvals

## 1. Expenses and receipts

The user's jobs are to capture a receipt the moment it is handed over, attach it to the
right project or job, and submit it without retyping it.

**Flow:** + Expense → camera → (auto-fill where available) → confirm fields → save as
draft → add to a report or submit.

- **Open straight to the camera** from "Add expense". The receipt is the first
  thing captured, and "Enter manually" is the fallback.
- **Save immediately.** The expense exists as a draft with its photo even if the
  details aren't complete. Never block saving on OCR or upload, which may not run
  offline.
- **Default category, project, job and payment method** from the current context
  (opened from a project or appointment) or the last entry.
- **Fields:** date (today), amount and currency, merchant, category, project/job,
  billable, note (optional).
- **Batch capture:** allow several receipts in one session, one expense each.
- **Rows show** the receipt thumbnail (left element), merchant (title), date ·
  category · project (subtitle), amount (right element) and a status tag (Draft,
  Submitted, Approved, Returned, Reimbursed).
- **Missing receipt or policy issues** (over limit, missing category) show a `warning`
  tag and say what to fix before Submit.

## 2. Approvals inbox

The approver's jobs are to see everything waiting for them, decide quickly on simple
items, look closer at complex ones, and leave a reason when rejecting.

**Structure:** one inbox across types (timesheets, expenses, change orders, purchase
requests), filterable by type, with a count badge on home.

- **Rows show** a type icon (left element), the requester and short description
  (title), the key context such as project or vendor (subtitle), the amount or hours
  (right element), and the age. Overdue items get a `warning` tag.
- **Sort by age, oldest first**, with a filter chip per type.
- **Approve from the list** only when the row holds enough to decide (for example a
  timesheet with standard hours). Use a swipe or row action, always with a visible
  alternative on the detail screen.
- **The detail screen** shows a summary header (who, what, amount, period), then lines
  and attachments, then Approve as the main action and Reject (secondary, `isDanger`)
  in the bottom panel.
- **Reject or return asks for a comment**, and the comment is shown to the requester
  on their record.
- **Bulk approve** applies only to low-risk types (timesheets). It shows the count
  and confirms ("Approve 6 timesheets, 228h total?").
- **Decisions made offline** show "Approved. Waiting to sync" and the item leaves
  the "to do" list. Failures come back with the reason.
- **No dead ends:** an approval that has already been decided elsewhere shows who
  decided it and when, instead of an error.
