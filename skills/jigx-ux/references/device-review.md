# Device Review: Walk the App on a Simulator

The lint reads files. Many problems only show on a device: cut-off titles, text that
doesn't fit, buttons covering content, wrong numbers from pre-filled fields, slow steps
with no loading sign. When a simulator with the Jigx app is available, walk the main
flows and take a screenshot of each screen.

## 1. Before you start

- **Ask first.** A walkthrough creates real data (starts appointments, adds photos and
  lines, syncs). Use a test record, and only do it when the owner agrees.
- **Tools (macOS):** Xcode's `xcrun simctl` for screenshots, text size and restarting
  the app, and `idb` (`brew install idb-companion` and `pip install fb-idb`) for taps,
  swipes, typing and the list of on-screen elements. `scripts/sim.sh` wraps both.
- The solution must already be published and the user signed in. The agent can't sign
  in for them.
- The Jigx app's bundle ID is `com.jigx.frontline`.

```sh
S=skills/jigx-ux/scripts/sim.sh
$S shot 01-home /tmp/ux          # screenshot + list of on-screen elements with positions (points)
$S tap 200 750                   # tap at x,y in points (from the element list)
$S swipe 330 175 120 175         # swipe a row left
$S text "2"                      # type into the focused field
$S textsize extra-extra-large    # change text size AND restart the app
$S textsize large                # back to the default
```

Use the element list to find where to tap. Positions change when banners appear, so
take a new list after each step.

## 2. What to walk

Walk the main journeys of the solution's domain playbook, for example:

1. Home → open the next record → start it.
2. Add each kind of thing the user adds (photo, line, time, note), including the
   empty state before the first one.
3. Edit a value, then leave without saving.
4. Delete something with a swipe.
5. Finish the flow (complete, sign, submit).
6. Repeat two or three of the busiest screens with:
   - **Large text:** `textsize extra-extra-large`, then the largest size
     (`accessibility-large`). **Restart the app after changing the size**, because a
     running app doesn't fully re-layout, and that looks worse than real use.
   - **A small phone** (iPhone SE simulator). The app must be installed and signed in
     there, which is usually the user's step.
   - **Dark mode:** `xcrun simctl ui booted appearance dark`.

Set the text size back to `large` and appearance back to `light` when finished.

## 3. What to look for on each screen

| Look for | Example |
| --- | --- |
| Title cut by header buttons | "Appointment Ti..." next to a "Pending" badge |
| Text cut in half or labels broken mid-word | "Customer Na", "Setting / s" at large text |
| More than two bottom buttons, or a "..." menu | `actions-layout.md` |
| Floating buttons covering content | The home button over the price in the last row |
| Custom parts that don't look native | `custom-components.md` |
| Internal names | `add-appointment-photos`, photo file names, IDs |
| Red used for a normal state | "Not Started", "Local", "Pending" in red |
| The same status in different colours | "Not Started" red on Home, grey on the record |
| Empty states that don't help | "No data" with an empty "Total:" |
| Fields that don't apply | Warehouse "/" on a service item |
| Pre-filled numbers that append | Quantity 1, type 2 → 12 |
| Disabled buttons with no reason | A greyed-out "New Time Entry" |
| Delete without "are you sure?" | Swipe → Delete removes the line at once |
| Slow steps with no loading sign | A black screen for 5 s after picking a photo |
| Hidden scroll | A fifth tab off-screen, with nothing showing you can scroll |
| Typos and wrong plurals | "Model equiment", "1 files" |

## 4. Output

Each problem becomes a proposal (`change-proposals.md`) with **Source:**
`device (screenshot <file>)`, and the steps to see it. Group the same problem across
screens into one proposal. Say which checks you did not do ("not checked on a small
phone or Android").

Some things the solution can't change, because the Jigx app decides them, such as
where the floating home button sits. The only setting is `isHomeButtonVisible: false`
per screen. Report those as notes for the Jigx product team, not as proposals for the
solution.
