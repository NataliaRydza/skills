# Domain Playbook: Field Service

This playbook is for technician apps: appointments, service orders, work orders and
visits. The technician's jobs are to see today's work in order, get to the site,
understand the job, move it through its statuses, record what was done and used, get a
sign-off, and close it out, often with no signal.

## 1. Screen structure

```text
Home (today)                 running/current appointment first, then today's agenda
  └─ Appointment workspace   context header + tabs + state-driven main action
       ├─ Overview           customer, site, contact (call/navigate), schedule, instructions, equipment
       ├─ Checklist / tasks  progress, each item → own screen → back to checklist
       ├─ Lines              parts and services used, quantities inline
       ├─ Time / staff       labour logs, who worked, durations
       ├─ Photos & files     multi-capture, thumbnails, per-file sync state
       ├─ Notes              short note list or one rich note (full-screen editor)
       └─ Report             PDF preview → Share / Regenerate (jig.document)
  └─ Sign-off / complete     summary → signature → complete (gated)
```

## 2. Home / today's agenda

- **Open on today's ordered agenda**, with the appointment in progress pinned at the
  top ("Open appointment" as the main action when one is running).
- **Each row shows** the time window, customer or site name (title), appointment
  number and job type (subtitle), address (description), and a status icon and
  colour (left element). Add a "has instructions" or "parts required" tag only when it
  applies.
- **Quick filters:** Today, Upcoming, Recent. Search by customer, number, address.
- **Navigate and call are one tap**, from the record header (and from the row via
  swipe or row action where it doesn't clutter).
- **Don't show unconfirmed or undispatched work** if the business doesn't want
  technicians acting on it. Show only what the technician can act on.

## 3. Status flow

Typical states: Scheduled → Travelling (Depart) → On site (Arrive) → In progress (Start)
→ Paused → Completed, with Cancelled as an exception.

- **Show only the next valid action** as the main bottom action (Start, Pause or
  Resume, Complete). Put rare transitions (Cancel, Reschedule) in the overflow with a
  confirm.
- **Record timestamps automatically.** The technician never types the time of a
  status change. Show the recorded time in the confirmation ("Started at 09:42").
- **Follow confirm, then work, then navigate** for Start, Pause, Resume and Complete
  (core rule 3.1). Cover the work with a placeholder, and disable the action on tap.
- **Show the result before opening the next screen.** "Appointment started", then open
  the checklist.
- **Status changes save locally and queue.** They must work in a basement with no
  signal. The header shows "Waiting to sync" until sent.
- **Keep only one running appointment per technician** if the business requires it.
  Starting another prompts to pause the current one, and doesn't silently fail.

## 4. Appointment workspace

- **The header shows** the customer, appointment number, status tag, time window and
  address. Tap-to-call and navigate are reachable without scrolling.
- **Instructions and safety notes come first** in Overview, in an expander that is open
  by default when present. They must never be buried at the bottom.
- **Equipment and asset** show the name, serial and last service date. Serial scanning
  is available where equipment is identified on site.
- **History:** previous visits to the same site or equipment, in a short list (date,
  summary, technician), so the technician understands the context.

## 5. Checklists and tasks

- **Show progress** ("4 of 7 done", `component.progress-bar` or a summary).
- **Each item opens its own screen**, and finishing it returns to the checklist while
  items remain, or to the appointment when all are done (core rule 5.1).
- **Required items are marked**, and incomplete required items block Complete with a
  link (section 7).
- **Readings and measurements** use number fields with units and expected ranges.
  An out-of-range value shows a warning, not an error, unless the business forbids it.
- **Photos required by an item** are captured inside the item, not on a separate tab
  the technician must remember.

## 6. Parts, services and time

- **Add parts by search, scan, or from the planned lines.** Planned lines show
  "planned qty" vs "used qty", and the technician only adjusts the difference.
- **Edit quantities inline** with a stepper or numeric keypad. Show the unit and line
  total on the row (when the role is allowed to see prices).
- **Labour/time** defaults from the status timestamps (start to complete minus
  pauses), and the technician can adjust it with a reason. Display as hours and
  minutes.
- **Stock shows its freshness** ("On van: 3 · as of 07:30") when it comes from the last
  sync. Don't block adding a part because live stock is unavailable offline.

## 7. Completion gate

Before Complete, check the business-readiness rules and list all blockers at once:

```text
To complete this appointment:
  • Finish 2 required checklist items      → Open checklist
  • Record labour                           → Open time logs
  • Customer signature                      → Sign
```

- Complete stays visible but disabled with the reason, or opens this list. It never
  fails silently (core rules 2.4 and 2.5).
- **Pick a completion reason** only when the business needs one, with a short list.
  Explain it when the reason disables other actions, and let the user change it
  (core rule 2.7).
- After Complete, the record becomes read-only with a clear state ("Completed 11:24 ·
  Waiting to sync"). The next appointment or home is one tap away.

## 8. Sign-off and service report

- **The sign-off screen shows what the customer is signing:** work done, parts and
  labour summary, total if relevant, then the signer name and signature pad.
- **Generate the report PDF on the device** where possible, and show it in
  `jig.document` with Share and Regenerate. Say so when the report reflects unsynced data.
- **Never claim "Sent to customer"** until it really was. Otherwise say "Will send
  when online".

## 9. On-site quote or upsell

- **Start from the current appointment.** Customer, site and equipment are prefilled.
- **Show tiered options side by side** (Good / Better / Best) when the business
  sells that way. Prices come from the price list, and the technician never calculates.
- **The customer signs on the device**, the quote PDF is shared, and conversion to
  an order happens in the office or with an explicit action.

## 10. Pitfalls seen in field apps

- The mobile app is slower or more limited than the web, so technicians stop using it.
  Keep screens light and local-first.
- Too many taps to change status. Status lives in the main action, one tap plus a
  confirm.
- Instructions and required parts are buried at the bottom of a long form.
- Technicians finish the job but leave without the signature, labour or photos. Use
  the completion gate.
- Duplicate status changes from double taps. Disable on tap.
- False "Offline" or "Unsaved items" warnings make technicians distrust the app.
