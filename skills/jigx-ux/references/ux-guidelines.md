# Jigx UX guidelines

Core rules for every Jigx app screen. They came from fixes and QA feedback on
production field-service, sales and time solutions, keeping only what applies to
every customer. If a solution documents a different behaviour for a customer,
that wins for that customer. Data and sync rules always win over a UX rule.

These rules are deliberately short. The detail lives in the topic references:
`screen-patterns.md`, `lists-and-tables.md`, `forms-and-input.md`,
`feedback-and-sync.md`, `mobile-foundations.md` and the domain playbooks. YAML
shapes are in `yaml-patterns.md`.

## 1. Every screen

1.1 **Every full screen has a title.** Name what the user is looking at
("Photos", "Select Complete Reason Code"), not the action that opened it.

1.2 **Every `jig.default` / list screen has a header image.** Use a small
`component.jig-header` with a registered image:

```yaml
header:
  type: component.jig-header
  options:
    height: small
    children:
      type: component.image
      options:
        source:
          uri: https://images.jigx.com/frontline/tools.jpg
```

Bottom sheets, modals and full-screen editors (`jig.full-screen`) do not need one.
Use the same image for screens of the same area so the app looks consistent.

1.3 **Images and icons must be registered.** Add header images to
`assets/images.jigx` and icons to `assets/icons.jigx`; both are cached for
offline use. Use current **Tabler outline** icon names (never `-filled` or old
Streamline names); check them with `scripts/check-icons.mjs` (see `icons.md`).
An unregistered name shows a blank or broken icon offline.

The registry is only filled automatically from icon names written in the YAML.
Icons that come from **data** are not detected, so check and declare them by hand:

- **Dynamic Data tables with an icon column** (menus, message profiles, status
  tables). Every icon value in those tables, for every customer's data, must be
  in `assets/icons.jigx`. Re-check when a row is added or its icon changes.
- **Static datasources** that list an icon per row (e.g. an action list).
- **Expressions that build the icon name** (`=cond ? 'icon-a' : 'icon-b'`):
  declare every possible value.

To find tables that supply icons, search for icon columns read from data, e.g.
`grep -rn -F "'\$.icon'" . --include='*.jigx'`.

1.4 **Hide empty values instead of showing blanks.** A missing comment,
description or name hides its row (or shows nothing) instead of `N/A`, an empty
label or a dangling separator.

1.5 **Dates and times follow the solution's display settings** (date order,
12/24-hour). Use the solution's shared format expressions or functions. Never
hard-code a date or time format on one screen.

1.6 **Show only what helps the user.** Never display development or technical
information: internal IDs, GUIDs, raw JSON or error payloads, queue/state
names, debug counters, test labels or developer notes. If it does not help the
user do the job, it does not belong on the screen. Debugging aids stay on
debug-only screens, hidden from users.

1.7 **Colours match the meaning.** Use colour consistently:

| Meaning | Colour |
|---|---|
| Error, blocks the user, destructive action | `negative` (red) |
| Needs attention, but the user can continue | `warning` (orange) |
| Done, success | `positive` (green) |
| Information, neutral status | `primary` or a neutral colour |
| Saved on device, waiting to sync | neutral (or `isWaitingSync` style), never `negative` |

Do not use red for information or a normal state (a record that is only
waiting to sync is normal), and do not use green for something that is not
finished. If everything is highlighted, nothing stands out, so keep strong
colours for things that need action. Never use colour alone: pair it with tag
text or an icon, because colour-blind users and sunlight both wash it out.

1.8 **Use the user's words, the same way everywhere.** Use the business's
language, not ERP or code names (no internal field names such as
`DetailLineRef` or table names). Use one term for one thing across the app
(don't mix "job", "visit" and "appointment" for the same item) and match the
capitalisation style of the surrounding screens.

1.9 **Keep text short and put the important part first.** Titles and
subtitles fit on one line where possible. Explanations are one or two short
sentences, not paragraphs.

1.10 **Show where the user is.** On screens opened from a record (e.g. an
appointment), keep its context visible (number, customer or line) so the user
always knows which record they are changing.

1.11 **One icon, one meaning.** Use the same icon for the same meaning across
the app, and don't reuse an icon that already means something else (e.g. a
delete icon for "clear filter").

1.12 **Numbers are formatted for people.** Money uses a shared currency
format, durations read as hours and minutes, and quantities don't show
unnecessary decimals.

## 2. Actions

2.1 **Do not repeat an action on the same screen.** One action, one place:
e.g. one "Add" on a Photos screen, not a header button plus a list button plus
a floating button. If an action exists in the header, don't repeat it in the body.

2.2 **Remove actions the customer does not use**, instead of leaving them
visible but non-functional. Prefer a config flag over deleting shared code.

2.3 **Labels say exactly what happens.** Short verbs: "Sign", "Complete",
"Open time logs". Avoid generic labels ("Submit", "OK") when a specific one
fits, and avoid labels that describe something the button no longer does.

2.4 **A disabled action explains why.** When an action is disabled by a
business rule, show the reason next to it (warning tag, subtitle or the
screen's error/warning list), e.g. "Complete reason selected" on Pause. A user
should never face a greyed-out button with no explanation.

2.5 **An error that blocks an action offers a way to fix it.** If Complete is
blocked because something is missing, show a navigation action to the screen
where it is fixed ("Open line items", "Open time logs").

2.6 **Disable an action as soon as it is tapped.** Set a jig state flag on tap
and use it in `isDisabled`, so a double tap cannot run the action twice
(duplicate records, two submissions, duplicate report versions).

2.7 **A rule that blocks an action must not trap the user.** Before adding a
block, check the user can still get back (change the choice, go back, finish
the required step). If a selection disables other actions, the user must be
able to clear or change it.

2.8 **Confirm destructive actions, and only those.** Delete, discard, cancel
and similar actions ask first, name what will be lost, and use a red confirm
button. Safe actions don't ask for confirmation.

2.9 **Make the main action obvious.** Each screen has one main action that
stands out (`style.isPrimary`); secondary actions are visually quieter. Put
it in the bottom action panel, where the thumb reaches, rather than only in
the header.

2.10 **Actions are easy to hit.** Rows are full width and tappable, small
icon-only buttons are avoided for important actions, and destructive actions
are not placed next to the frequent ones (see `mobile-foundations.md`).

2.11 **Every gesture has a visible alternative.** Anything available by swipe
is also available on the record screen or in an action menu.

## 3. Long-running actions and feedback

3.1 **Confirm first, then work, then navigate.** For actions such as Start,
Pause, Resume and Complete: show the confirmation (with the recorded time)
before the slow work, run the work, and navigate only when it has finished.
Do not navigate away mid-way.

3.2 **Cover slow work with a placeholder.** Use a jig `placeholders` entry
driven by a state flag so the user sees progress and cannot interact with a
half-updated screen:

```yaml
placeholders:
  - title: Completing your appointment
    icon: loading-data
    when: =@ctx.jig.state.completing = true
```

3.3 **Only show success messages that are true.** Do not say "Saved" or
"Uploaded" when the data was only queued locally, or show a message for a save
the user did not ask for. Use the queue/sync status for upload state.

3.4 **Show the result message before opening the next screen** (e.g.
"Appointment started" before the checklist opens), so the confirmation is not
lost behind the navigation.

3.5 **No flashing warnings.** A banner or warning (unsaved draft, previous
session) must not appear for a moment while a screen saves or navigates. Gate
it on a state that is stable during the transition.

3.6 **Errors say what happened and what to do.** Write errors in plain words
with the next step ("Couldn't upload the photo. It will retry when you're back
online."). Never show a raw ERP or system error as the whole message; keep
technical details for logs or support.

3.7 **Be honest about offline.** Let offline-capable actions run and show that
the change is waiting to sync. When something really needs a connection, say
so before the user starts, not after they've filled everything in.

3.8 **Toasts are for small confirmations only.** Anything the user must read
or act on stays on screen (banner, modal, error list) instead of a toast that
disappears.

3.9 **One sync vocabulary.** Use the same words, colours and icons for sync
state everywhere: "Waiting to sync", "Syncing", "Synced", "Sync failed",
"Offline". Connectivity and sync states are mutually exclusive on screen
(don't show "Offline" and "Syncing" together). See `feedback-and-sync.md`.

## 4. Editing and unsaved changes

4.1 **Save is enabled only when something really changed.** Compare the
content, not its length or a rebuilt copy of it. Compare at the precision the
user sees (e.g. minutes for times, visible text for rich-text notes), so an
edit the user can see is never treated as "unchanged".

4.2 **Returning to the original value is "no change".** Typing and deleting
back to the original, or opening and closing the keyboard, must not enable
Save or trigger a discard prompt.

4.3 **Ask before discarding unsaved changes**, and only then. Use `canGoBack`
with a confirm ("Discard changes?" / Discard / Keep editing). Opening and
leaving a screen without editing must never ask.

4.4 **Discard really discards.** Reopening the screen after Discard shows the
saved value, not the discarded edit. Reset component state that would
otherwise survive the visit.

4.5 **Read-only values are shown as read-only**, not as inputs that ignore the
user. Edit fields open next to the value being edited (under its row), not at
the top or bottom of a long screen.

4.6 **Never lose what the user entered.** A failed save, a validation error, a
sync error or opening another screen keeps the user's input.

4.7 **Show problems at the field, before Save.** Mark required fields, show
what is wrong next to the field, and explain why Save is disabled instead of
failing after the tap.

4.8 **Prefill what the app already knows.** Default to today, the current
user, the current record or line, and the last used choice where it makes
sense, so the user types as little as possible.

## 5. Lists and step-by-step flows

5.1 **After finishing a step, go to where the user continues.** When a
checklist (or task list) item is completed:

- if any item is still not completed, navigate back to the checklist so the
  user can open the next one;
- once all items are completed, navigate to the parent record (e.g. the
  appointment).

Never leave the user on the finished item's screen, and don't send them to the
parent record while steps are still open.

5.2 **Keep the item's own status visible.** Extra states (missing line,
pending sync) are added to the row text or summary; they do not replace the
item's status icon.

5.3 **Files show their name and open directly.** A PDF opens in the viewer
instead of an intermediate screen, and a file row shows the file name.

5.4 **Empty lists explain themselves.** An empty list says why it is empty and
what to do next ("No photos yet. Tap Add to take one."), not a blank screen.

5.5 **Lists are sorted in a useful, consistent order** (e.g. by date or time),
and long lists have search or filters.

5.6 **Refresh does one thing.** Pull-to-refresh and a header refresh run the
same action. Don't add separate Refresh, Sync and Reload buttons that overlap.

5.7 **Rows show what the user needs to decide.** The row title is the thing
the user recognises (customer, item, project), not an internal number.
Status, time and amount sit on the row so the user rarely has to open a record
just to check it. See `lists-and-tables.md` for row anatomy.

## 6. Checklist for a UX change

- [ ] Screen has a title and (if not a sheet/modal/full-screen) a header image
- [ ] New images/icons registered in `assets/images.jigx` / `assets/icons.jigx`,
      including icons from Dynamic Data tables, static datasources and expressions
- [ ] Icon names are current Tabler outline names (`check-icons.mjs` is ok, or
      migration steps given to the user)
- [ ] No development or technical information shown to the user
- [ ] Colours match the meaning (red only for errors/destructive actions;
      waiting to sync is neutral) and never carry meaning alone
- [ ] User's words, used consistently; short text; context visible
- [ ] Dates, times, money and durations use the shared formats
- [ ] No action appears twice on the screen; one obvious main action in reach
- [ ] Every swipe action is also available somewhere visible
- [ ] Disabled actions show why; blocking errors offer a way to fix them
- [ ] Destructive actions confirm; safe actions don't
- [ ] Actions disable on tap; slow work shows a placeholder; navigation waits
- [ ] Messages only claim what actually happened; errors say what to do
- [ ] Offline behaviour is clear; sync state uses the shared vocabulary
- [ ] Save/discard: no false "changed", Discard really discards
- [ ] User input is never lost; problems shown at the field; sensible defaults
- [ ] Finishing a checklist step returns to the checklist while steps remain,
      and to the parent record when all are done
- [ ] Empty lists explain themselves; lists have a useful order
- [ ] Rows show the recognisable name plus status/time/amount; one refresh action
- [ ] Domain playbook flow followed (if the screen belongs to one)
- [ ] Customer-specific behaviour is documented in the solution, not in this skill
