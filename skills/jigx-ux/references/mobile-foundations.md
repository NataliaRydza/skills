# Mobile Foundations

These are the physical and perceptual rules underneath every Jigx screen. Jigx renders
native components, so most sizing comes from the platform. These rules decide what you
put on a screen, where you put it, and how much of it there is.

## 1. Touch targets and reach

- **Target size.** Aim for 44 x 44 pt (iOS) and 48 x 48 dp (Android). Never go below
  the WCAG 2.2 floor of 24 x 24 px. For work gloves, larger is better: around 56 dp.
- **Prefer full-width rows to small buttons.** A `component.list-item` with `onPress`
  is a large, forgiving target. A small icon in a row's right element is not. Put
  important actions on the row or in the bottom panel, not as tiny icons.
- **Edges are the least accurate areas.** The centre of the screen gets the most
  accurate taps. The top and bottom edges need more room. Don't stack several
  small targets at the very top or bottom.
- **Thumb reach is a tendency, not a law.** The main action belongs in the bottom
  action panel because it is reachable and predictable. That does not mean every
  control must be at the bottom.
- **Separate the dangerous from the frequent.** Don't put Delete next to Save, or
  Cancel appointment next to Start. Put destructive actions in the overflow, behind a
  swipe with a confirm, or at the end of a section.
- **Keep the bottom panel small.** Show at most two visible actions
  (`numberOfVisibleActions: 1` or `2`). Put the rest in overflow. One main action
  plus one secondary is the usual shape.

## 2. Text, hierarchy and density

- Use the platform's text sizes. Don't shrink text to fit more fields: if it doesn't
  fit, the screen has too much on it.
- Keep titles and row titles to one line, subtitles to one line, and descriptions
  to two or three lines (`numberOfLines`). Put long text (notes, instructions) in
  an expander or its own screen.
- Use a visual order: the record's recognisable name, then its status, then key
  facts, then details. The ERP's field order is usually wrong for the phone.
- Group with sections and short headings ("Customer", "Schedule", "Lines"), not with
  long label prefixes.
- Support large text. Layouts must reflow at large accessibility text sizes. Prefer
  vertical stacks to side-by-side fields with fixed widths.

## 3. Contrast, colour and sunlight

- Text contrast is at least 4.5:1, and 3:1 for large text, icons and control borders
  (WCAG 1.4.3 / 1.4.11). Rely on the theme's semantic colours (`positive`,
  `negative`, `warning`, `primary`) rather than custom pale tints.
- Light blues, greens and greys wash out in direct sunlight. Status must still be
  readable from tag text and icons when colour is invisible.
- Never use colour alone for meaning (WCAG 1.4.1). A red row with no text is
  meaningless to a colour-blind user or in sunlight.
- Check both light and dark mode when a custom colour is used.

## 4. Frontline conditions

| Condition | Design response |
| --- | --- |
| One hand busy, gloves | Large rows, few small icons, main action at the bottom, avoid precise drag or multi-finger gestures |
| Sunlight, dirty screen | High-contrast text, status as text, no information in subtle tints |
| Noise | Don't rely on sound. Show visual confirmation of every important action |
| Interruptions | Drafts survive leaving the screen. The record context is always visible. Flows can be resumed |
| Low attention | One main action per screen, short labels, defaults prefilled, no reading required to proceed |
| Poor or no signal | Local-first saves, honest sync state, online-only features announced up front |
| Repeated daily tasks | Fewest taps for the common path. Remember last choices. Don't make the user scroll past rarely-used fields |

- **Capture beats typing.** Prefer scan (`action.open-scanner`), photo
  (`component.media-field`), signature, pickers and defaults over free text. Every
  typed field costs time and accuracy in the field.
- **Allow dictation.** Multi-line notes are plain text fields, so the device keyboard's
  dictation works. Don't block it with custom input.

## 5. Response times and progress

| Wait | What the user sees |
| --- | --- |
| Under ~0.1 s | Instant. No feedback needed beyond the change itself |
| Up to ~1 s | No special indicator. Disable the action so it can't be tapped twice |
| 1-10 s | A placeholder or busy state naming the work ("Completing appointment") |
| Over 10 s | Progress that moves (count or steps, e.g. "Uploading 3 of 7 photos"), and the user can leave or keep working |

- In Jigx, use jig `placeholders` with a `when:` state flag to cover a screen during
  slow work, and `isBusy` / `style.isDisabled` on an action while it runs.
- Never leave a permanent "Loading" placeholder. Every loading state has an exit:
  data, an empty state, an offline message, or an error.
- Initial sync after login is its own step with visible progress, not an endless
  spinner on the home screen.

## 6. Gestures and haptics

- Every swipe or long-press action has a visible alternative (record screen or
  action menu). WCAG 2.5.7 requires a single-tap alternative to drag gestures.
- Use one swipe direction for one meaning across the app (for example: swipe
  right-to-left reveals Delete everywhere).
- Don't use custom gestures that conflict with system back navigation.

## 7. Accessibility basics

- Every icon-only action has a title or label. Prefer a visible label anyway.
- Don't hide the focused field behind the bottom action panel or keyboard: put
  key inputs high on the screen in long forms.
- Login supports paste, password managers and biometrics. Don't make users
  transcribe codes.
- Don't put the only route to critical information, or the only Undo, in a toast
  that disappears by itself.
