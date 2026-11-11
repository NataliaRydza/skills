# Jigx UX Recipe Index

Load the smallest set of references for the task. `ux-guidelines.md` always applies.

| Task | Read |
| --- | --- |
| Any change a user can see | `ux-guidelines.md` (core rules + checklist) |
| New screen, or unsure which jig type or layout to use | `screen-patterns.md` |
| Home screen, hub, dashboard, KPIs, widgets | `screen-patterns.md`, then the domain playbook |
| Record detail with tabs (appointment, opportunity, project) | `screen-patterns.md` (record workspace) |
| List, search, filters, status tags, swipe actions, pickers | `lists-and-tables.md` |
| Showing tabular data (lines, timesheet week, budget) on a phone | `lists-and-tables.md` (tabular data) |
| Form, field choice, validation, defaults, dates, durations, numbers | `forms-and-input.md` |
| Save, discard, unsaved changes, drafts | `ux-guidelines.md` section 4, `forms-and-input.md` |
| Toasts, banners, modals, confirmations, error text | `feedback-and-sync.md` |
| Offline state, waiting to sync, sync failures, conflicts | `feedback-and-sync.md` |
| Touch targets, gloves, sunlight, accessibility, response times | `mobile-foundations.md` |
| Writing the YAML for any of the above | `yaml-patterns.md` |
| Choosing icons, checking icon names, Streamline → Tabler migration | `icons.md` |
| Field service / technician / appointments / work orders | `domain-field-service.md` |
| Time logs, time cards, timers, timesheets | `domain-time-tracking.md` |
| Accounts, contacts, activities, opportunities, quotes, orders | `domain-sales.md` |
| Projects, project hub, daily logs, tasks, punch lists, budgets | `domain-projects.md` |
| Expenses, receipts, approvals inbox | `domain-expenses-approvals.md` |
| Review or audit an existing solution's UX | `ux-review.md`, then `change-proposals.md` |
| Owner approval of proposed changes, implementing approved ones | `change-proposals.md` |
| Checking where a rule comes from | `sources.md` |

## Core Principles

- **The repeated task wins.** Optimise the thing a worker does twenty times a day:
  fewer taps, sensible defaults, the main action in reach.
- **Context first.** Every screen answers three questions: where am I, what is this
  record, and what should I do next?
- **Honest state.** Only say what actually happened. "Saved on device" is not
  "Uploaded", and "waiting to sync" is not an error.
- **Never lose work.** Drafts survive errors, navigation, interruptions and
  offline time.
- **One vocabulary.** Use one term, one icon, one colour and one tag text per
  meaning, across the whole app.
- **Explain every block.** A disabled action, a hidden feature or a failed
  validation always says why and how to fix it.
- **Mobile-specific, not desktop-ported.** Choose the fields and actions for the
  mobile job, and leave the rest to the web/ERP.

## Skill Boundary

This skill covers what the user sees and does. Use the `jigx` skill for data,
datasource, state and build mechanics, and `jigx-acumatica` for ERP rules. When a
UX wish conflicts with a data or sync contract, the contract wins. Then find
another way to make the state clear to the user.
