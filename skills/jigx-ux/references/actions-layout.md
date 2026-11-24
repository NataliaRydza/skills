# Screen Actions: At Most Two Buttons

The bottom action panel is the most valuable space on a screen. It holds what the
user does next. This reference covers what goes there, what doesn't, and how to fix a
screen that has too many buttons.

## 1. The rule

- **At most two buttons at any moment:** one main action (`style.isPrimary`) and one
  secondary action. One button is often better.
- **No three-dots menu.** When a group has more actions than `numberOfVisibleActions`,
  Jigx puts the rest behind a "..." button. Users don't look there, the list it opens
  has no context, and it makes the screen look unfinished.
- **No three buttons side by side.** Each button gets about a third of the width, so
  labels get cut ("Add to appoi..."), especially with large text. Three buttons of the
  same weight don't show what to do next, and they sit close enough to hit the wrong
  one, which is risky when one of them is Discard or Cancel.
- The two buttons must look different: the main one filled, the secondary one quieter.
  Two filled buttons ("Cancel" and "Add to appointment" both blue) look equally
  important.

## 2. Count per state, not per file

Most screens with many actions only show some of them at a time (`isHidden`). What
matters is the **largest number of buttons visible in one state**. Before proposing a
fix, write the state table:

| State | Visible buttons |
| --- | --- |
| Normal | Add (main), View budget |
| Upload failed | Retry uploads, Add, View budget ← 3, too many |

Common states are normal, error or sync failure, offline, record not synced yet
(local), another record already active, and finished or read-only. Read each
action's `isHidden` and `style.isDisabled` expression to fill the table. A
**disabled** button still takes space, so count it.

The UX lint reports a group when more than two of its buttons can show at the same
time (`too-many-actions`). It reads each button's `when` (or `isHidden: =$not(...)`) and
doesn't count buttons together when their conditions rule each other out, such as
`step=1` and `step=2`. When two buttons always show, it is a warning. When it depends
on data it can't read (an `or`, a calculated flag), it is marked needs verification,
and the table is the agent's job.

## 3. How to fix it

Use these in order. Usually one or two of them are enough.

1. **Let the main action follow the state.** The main button is the most useful action
   in that state, so it can change. For example: normally **Add** (main) and **View
   budget**. When an upload fails, **Retry uploads** becomes the main button, and Add
   moves to the header because it matters less until the error is solved.
2. **Move, don't hide.** If an action has to give way in some state, move it (to the
   header, or to a row on the screen) instead of hiding it. For example, a screen
   that shows **Retry** and **Clear errors** on an error, and hides **Add** until the
   errors are resolved, leaves the user unable to add anything. Put Add in the header
   during that state. Hide it only when the business rule really forbids it, and then
   say why (core rule 2.4).
3. **Don't show a button that can't be used here.** If another button already explains
   the state, drop the disabled one. For example, on an appointment with a sync error,
   show **Review error** instead of a disabled **Action** button next to it.
4. **Navigation belongs on the screen, not in the panel.** "View budget", "History",
   "Print", "Open time logs" are places to go. Show them as rows with a chevron
   (`component.list-item`) or in a section, and keep the panel for doing things.
5. **Group the rest into one Actions screen.** When a record has many possible actions
   (Depart, Start, Print, ...), use one **Action** button that opens a list of them,
   each with an icon and a short description. This is clean, unlike the three-dots
   menu, because every action is explained.
6. **Keep destructive actions apart.** Delete, Discard or Cancel appointment don't share
   the panel with the main action. Put them at the end of the screen, in the action
   list, or behind a swipe with a confirm (core rule 2.8).

### Header buttons

Header buttons sit in `header.options.actions` (see `file-upload-batch-review.jigx` in
AcumaticaBase):

```yaml
header:
  type: component.jig-header
  options:
    actions:
      - type: action.action-list
        options:
          title: Add media
          actions: [...]
```

The header is a good place for an action that is secondary in the current state. Each
header button takes room from the title, though, so check on a small phone that the
title is still readable (`device-review.md`). If it's cut, shorten the title or move
status information (such as a "Pending" badge) into the screen.

## 4. Worked example: appointment screen

`jigs/Appointment/view-appointment.jigx` has `numberOfVisibleActions: 3`:

| Button | Shown when | Disabled when |
| --- | --- | --- |
| Review Error | the appointment has a sync issue | - |
| Open Active Appointment | another appointment is active (single-active setting on) | - |
| Action | the appointment isn't local | errors, a sync issue, or another appointment is active |

| State | Visible |
| --- | --- |
| Normal | Action |
| Sync issue | Review Error, Action (disabled) |
| Another appointment active | Open Active Appointment, Action (disabled) |
| Sync issue and another active | Review Error, Open Active Appointment, Action (disabled) ← 3 |

**Proposal:** hide **Action** whenever it would be disabled, because the other button
explains why. That gives one button in every state but the last, where the two
remaining buttons fit. Set `numberOfVisibleActions: 2`.

## 5. Proposal wording

When the lint or a walkthrough finds this, the proposal includes the state table and
the new layout per state:

```markdown
## P4 [Medium] Show at most two buttons on the Photos screen

- [ ] **Approve**
- **What's wrong:** When an upload fails, the screen shows three buttons (Retry uploads, Add, View budget). The labels are cut off, and it's not clear which one to press.
- **Why change it:** After a failed upload, Retry is what the user needs, but it looks no more important than the others.
- **Proposed fix:** Normal: Add (main) + View budget. Upload failed: Retry uploads (main) + View budget; Add moves to the header. View budget could also become a row on the screen.
```
