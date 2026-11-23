# Custom Components: Match the Native Look

Jigx's native components (list items, field rows, summaries, cards, banners, tags)
look the same on every screen and adapt to text size, dark mode and the platform.
Custom components (`component.custom-component`) and layouts built by hand from
`component.view` and `component.text` don't adapt on their own. They are where
screens most often look "off" or break on another device.

## 1. Prefer the native component

Before building a custom layout, check whether a native component already does the
job:

| Need | Native component |
| --- | --- |
| A row with title, subtitle, status, right value, chevron | `component.list-item` (with `tags`, `rightElement`) |
| Label and value pairs (record details) | `component.entity` with `component.field-row` / `entity-field` |
| A total or a few key numbers at the bottom | `component.summary` |
| A message that needs attention | `component.banner` |
| A grouped block with a heading | `component.section`, `component.card` |
| Status | tags on the list item, not coloured text |

Build a custom component only when no native one fits, and say why in the proposal or
the change.

## 2. If it's custom, it must look native

Compare the custom component with the native component that does the same job, on the
same device, side by side (`device-review.md`). Check:

- **Text:** the same sizes and weights as native rows. Title in the normal text
  colour, secondary text in the grey secondary colour, no extra bold.
- **Spacing:** the same padding and gap between rows as a native list. No large empty
  areas.
- **Shape:** the same background, corner radius and card style as the native rows
  around it. Plain text on the screen background next to white rounded cards looks
  unfinished.
- **Icons:** Tabler outline names, the same size and the same circle or plain style
  as native rows on that screen.
- **Status:** the native tag style and the shared colours and words (core rules 1.7,
  3.9). Say a state once, not three times (tag + sentence + icon).
- **Taps:** if something looks tappable (an icon on the right, a chevron), it is
  tappable. If a whole row opens something, the whole row is the target.
- **Text fits:** long names wrap or end with "...", and nothing is cut in half.
  Check with the largest text size (after restarting the app), on a small phone, and
  in dark mode.
- **Words:** no internal names, file names or IDs (core rule 1.6). Correct singular
  and plural ("1 file", not "1 files").

## 3. Example: "Upload local changes"

This screen (`jigs/Home/sync-progress.jigx` in AcumaticaBase) is built by hand:

- 👍 The title is clear, the summary gives a count, and every row says its state in
  words.
- 👎 The rows are plain text on the background, while the rest of the app shows rows
  as white rounded cards (`component.list-item`). The screen looks like a different
  app.
- 👎 The summary card is large, with a lot of empty space, for one line of
  information.
- 👎 "2 changes and 1 files to upload": the plural is wrong ("1 file").
- 👎 A photo row shows the internal file name `BEF-JX20261119091637782-6145455.jpg`.
  "Before photo" would tell the user what it is.
- 👎 Each row says the same thing three times: "Waiting to send changes", the
  "Waiting" tag and a cloud icon. "0 of 1 files uploaded" adds a fourth. One tag
  ("Waiting to sync") is enough.
- 👎 The cloud icon on the right looks like a button. If it isn't one, it confuses
  users.

**Proposed fix:** native list-item rows (title: the record, subtitle: customer or
photo type, tag: one sync state, no right icon unless it does something), a smaller
summary using `component.summary` or a banner, and correct plurals.

## 4. What the lint reports

`ux-lint.mjs` flags files that use a custom component or a hand-built view and text
layout (`custom-layout`, info). It can't see what they look like, so each one needs a
device check. Start with the screens users see most.
