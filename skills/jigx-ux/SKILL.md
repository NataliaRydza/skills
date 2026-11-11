---
name: jigx-ux
description: Use when designing, building, changing or reviewing anything a user sees or does in a Jigx app - screens, home hubs, record workspaces, lists, tables, forms, actions, messages, offline and sync state, edit and discard flows, checklists, dashboards. Covers mobile and frontline UX foundations (touch targets, contrast, gloves, interruptions), Jigx component choice, verified YAML patterns, and domain playbooks for field service, time tracking, sales and order entry, project hubs, expenses and approvals. Includes a UX review procedure, a heuristic UX lint, and an icon check that flags old Streamline icon names and hands off to the icon-migration skill (or gives the user migration steps).
---

# Jigx UX

Use this skill together with the generic `jigx` skill whenever a change affects what
the user sees or does. The rules are generic. Examples come from field-service, time,
sales and project apps but apply to any Jigx solution.

Jigx users are mostly frontline workers: one hand busy, outdoors or in a basement,
interrupted often, offline at times, and doing the same job many times a day. Design
for speed of the repeated task, honesty about data and sync, and recovery from
interruption. That matters more than visual novelty.

## Workflow

1. Read `references/recipe-index.md` and load only the references the change needs.
2. Always apply `references/ux-guidelines.md` (the core rules). It is short, and every
   change is checked against its checklist.
3. Pick the screen pattern before writing YAML: hub, list, record workspace, form,
   picker, sheet or document (`references/screen-patterns.md`).
4. If the change belongs to a known domain (field service, time, sales, projects,
   expenses or approvals), read that domain playbook and follow its flow and list or
   header fields.
5. Copy YAML shapes from `references/yaml-patterns.md` instead of guessing property
   names. Inspect the generated YAML when unsure, as the `jigx` skill describes.
6. Before finishing, run the checklist at the end of `ux-guidelines.md`, the
   heuristic lint `node scripts/ux-lint.mjs <solution> --text` and the icon check
   `node scripts/check-icons.mjs <solution>`. If icons need migration, follow
   `references/icons.md`: run the icon-migration skill when it is available, or give
   the user the steps in it. For a review of an
   existing solution, follow `references/ux-review.md`.
7. **Propose before improving.** A change the owner asked for is implemented
   directly. Anything else the agent finds (reviews, audits, problems noticed along
   the way, icon migration) becomes a numbered proposal for the owner to approve
   first, drafted with `scripts/propose.mjs`. Implement only approved proposals, then
   report per ID (`references/change-proposals.md`).
8. If a solution documents its own UX or customer-specific behaviour, follow it where
   it differs. Keep customer-specific rules out of this skill.
9. Data and sync rules win over a UX rule. Never trade local-first or sync
   correctness for a smoother screen.

## Reference Map

- `references/recipe-index.md` - which reference to read for which task.
- `references/ux-guidelines.md` - the core rules for every screen, plus the checklist.
- `references/mobile-foundations.md` - touch targets, reach, typography, contrast,
  frontline conditions, response times, gestures, accessibility.
- `references/screen-patterns.md` - jig type choice, home hub, record workspace
  (header, summary, tabs), dashboards and KPIs, loading and empty states, navigation.
- `references/lists-and-tables.md` - row anatomy, status tags, sorting, search,
  filters, tabular data on a phone, swipe actions, pickers, bulk actions.
- `references/forms-and-input.md` - field choice by data type, labels, required and
  optional, validation timing, defaults, dates, durations, numbers, scanning, media,
  one form versus a wizard, save and discard.
- `references/feedback-and-sync.md` - which feedback element to use, message writing,
  confirmations, errors, the offline and sync state vocabulary, conflicts.
- `references/yaml-patterns.md` - verified Jigx YAML for the patterns above.
- `references/domain-field-service.md` - technician agenda, appointment workspace,
  status flow, checklists, parts, signature, completion gate, on-site quote.
- `references/domain-time-tracking.md` - running timer, clock in and out, switch job,
  manual entry, durations, week view, overlaps, approvals and locking.
- `references/domain-sales.md` - accounts, contacts, activities, opportunities,
  quotes and orders, item search and scanning, pricing and totals.
- `references/domain-projects.md` - project hub ("project central"), daily logs,
  tasks and punch items, documents, project time, budget versus actual.
- `references/domain-expenses-approvals.md` - receipt-first expenses, approvals inbox.
- `references/icons.md` - Tabler outline icon rules, the icon check, when to run the
  icon-migration skill, and the steps to give the user when it can't run.
- `references/change-proposals.md` - propose, owner approves, implement only the
  approved ones, report per ID.
- `references/ux-review.md` - how to audit a solution: searches, heuristics,
  severity, report format.
- `references/sources.md` - research sources behind the rules.
- `scripts/ux-lint.mjs` - dependency-free, line-based UX lint for `.jigx` sources
  (review prompts, not proof). Tests: `scripts/ux-lint.test.mjs`.
- `scripts/propose.mjs` - drafts `ux-proposals.md` (numbered proposals with Approve
  checkboxes) from the lint and the icon check. Tests: `scripts/propose.test.mjs`.
- `scripts/check-icons.mjs` - read-only check for old Streamline or invalid icon
  names, using the installed icon-migration skill. Tests: `scripts/check-icons.test.mjs`.

## Guardrails

- Do not implement UX improvements nobody asked for until the owner approves them.
  Propose them instead.
- Do not show development or technical information to users.
- Do not add a confirmation to a safe action, or skip one on a destructive action.
- Do not show a success message for work that was only queued, and do not style
  "waiting to sync" as an error.
- Do not let the user lose entered data, whether through failed saves, navigation or
  interruptions.
- Do not repeat an action on the same screen, or leave a disabled action unexplained.
- Do not port a desktop or ERP form to mobile unchanged. Keep only the fields the
  mobile job needs.
- Do not use Streamline or `-filled` icon names, and do not rename icons by hand
  across a solution. Use the icon-migration skill.
- Do not invent YAML properties. Use the shapes in `yaml-patterns.md` or the SDK.
- Do not add a rule here that only applies to one customer.
