# Feedback, Messages And Sync State

Users trust an app that tells the truth about what happened, especially when it
works offline.

## 1. Choose the feedback element

| Need | Element | Jigx |
| --- | --- | --- |
| Small confirmation of an action the user just did | Toast | `action.show-alert` with `presentAs: toast`* |
| Persistent state on a screen (draft exists, sync failed, record locked) | Banner | `component.banner`* at the top of `children` |
| Slow work in progress, screen must not be touched | Placeholder | jig `placeholders` with `when:` |
| Decision before a destructive or irreversible action | Confirm dialog | `action.confirm` with `modal` |
| Information the user must read before continuing (offline restriction) | Info modal | `action.info-modal` |
| Problem with one field | Field error | `errorText` on the field |
| Problem with one row | Row style or tag | list-item `style` / `tags` |
| Count of things that need attention | Badge | jig or tab `badge` |
| Why an action is disabled | Text next to it | Banner, helper text, or subtitle |

\* Used in production solutions but not present in all SDK typings. Check that the target
runtime supports them (see `yaml-patterns.md`).

- **Toasts are only for confirmations the user can safely miss.** Anything the user
  must act on stays on screen. Toasts never carry the only Undo or the only error.
- **Show one message per event.** A save shows one acknowledgement, not a toast plus
  a banner plus a modal.
- **No stale messages.** A toast from the previous screen must not appear after
  navigation. Show the result before navigating (core rule 3.4), and group toasts
  (`group.id`) so they replace each other.
- **No flashing banners.** Gate banners on state that is stable during save and
  navigation transitions.

## 2. Confirmations

- **Confirm only destructive, irreversible or costly actions:** delete, discard,
  cancel an appointment, submit a timesheet for approval, send to the customer. Never
  confirm safe actions like Save, Open or Add.
- **The dialog names the thing and the consequence:** "Delete 3 photos? They have
  not been uploaded and will be removed from this device."
- **Button labels are outcomes:** "Delete photos" / "Keep", "Discard" / "Keep
  editing". Never "Yes" / "No" or "OK" / "Cancel" when a verb fits.
- **For frequent, low-risk removal, prefer undo** over a confirm where the flow
  allows it.
- **Confirm-then-work-then-navigate** for long-running state changes (core rule 3.1).

## 3. Writing messages

- **Say what happened, then what to do.** "Couldn't upload 2 photos. They'll retry
  when you're back online." "Complete is blocked: add a signature."
- **Use the user's words.** Name the record ("Appointment SO-1042"), not the table.
  No codes, stack traces or JSON. Put technical detail in logs or a support screen.
- **Be specific, not generic.** Avoid "Something went wrong" and "Error occurred".
  If the cause is unknown, say what didn't happen and what the user can do (retry,
  contact the office).
- **Keep the tone neutral.** No blame ("You entered an invalid value") and no jokes.
  "Please" and "Sorry" add length, not clarity.
- **Keep it short.** A title of a few words, plus one or two sentences of description.
- **Don't use form errors for problems the user can't fix** (permissions, server
  outage). Show those as a banner or modal with the next step.

## 4. Errors that block

- An error that blocks an action **links to where it can be fixed** ("Open time
  logs").
- **List all blockers at once**, not one per tap. "To complete: add signature,
  record labour, finish 2 checklist items."
- **Never trap the user.** There is always a way back or a way to change the choice
  that caused the block (core rule 2.7).

## 5. Offline and sync vocabulary

Use one set of words, icons and colours across the app.

| State | Text | Colour / style | Where |
| --- | --- | --- | --- |
| Offline | "Offline" / "You're offline. Changes are saved on this device." | Neutral grey, not red | Header indicator. Banner only where a feature needs a connection |
| Saved locally, waiting | "Waiting to sync" | Neutral / `isWaitingSync` | Row, record header |
| Syncing | "Syncing" (with count if useful) | `primary` | Header indicator |
| Synced | Nothing, or "Synced" briefly | `positive` (short-lived) | Don't decorate every synced row |
| Sync failed, retrying | "Will retry" | `warning` | Row, home indicator |
| Sync failed, needs user | "Sync failed: open to fix" | `negative` | Row, record banner, home badge |
| Data freshness | "Updated 09:40" / "As of yesterday" | Secondary text | Lists and figures from a sync |

- **Connectivity and sync states are mutually exclusive on screen.** Show the one
  that applies (Offline, Syncing, Waiting (n), Issues (n), idle), not several.
- **Never show a false Offline.** Base the indicator on the platform's real
  connectivity state, and don't show it during a normal sync.
- **"Saved on device" is a success, but not "Uploaded".** Use queue or sync state for
  upload claims (core rule 3.3).
- **Say up front when something needs a connection.** If a feature is online-only
  (live price check, remote search, PDF from the server), say so before the user
  fills anything in, with an info modal or disabled action plus reason. Keep the
  rest of the app usable.
- **Offline refresh explains itself.** Pulling to refresh while offline shows "You're
  offline. Showing data from 09:40", not a failure or an endless spinner.
- **Sync issues are actionable.** A sync issue screen lists each failed record in user
  terms (what, when, why in plain words) with Retry and Open record. Raw payloads stay
  behind a support or debug view.

## 6. Conflicts and server-side changes

- **Don't silently overwrite important data.** For low-stakes fields last-write-wins
  is acceptable. For status, quantities, signatures and times, tell the user which
  version was kept.
- **When the server rejects a queued change**, keep the user's data, mark the record
  as needing attention, and explain what to change. Never delete the local edit.
- **IDs assigned on sync:** records created offline show a temporary label
  ("New appointment", "Draft") until the real number arrives. Don't show a fake
  final number, and don't show the temporary GUID.
