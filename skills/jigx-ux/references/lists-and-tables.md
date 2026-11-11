# Lists, Tables, Search And Pickers

Lists are most of what a Jigx user looks at. A good list lets the user decide without
opening a record.

## 1. Row anatomy (`component.list-item`)

| Slot | Put here | Avoid |
| --- | --- | --- |
| `title` | What the user recognises: customer, item description, project name | Internal numbers alone, GUIDs |
| `subtitle` | The second identifier or the time: "SO-1042 · 09:00-11:00" | Repeating the title |
| `description` | One or two lines of useful detail (address, quantity, short note) | Long notes. Use `numberOfLines` to cap |
| `leftElement` | Status or type icon (duotone, coloured by status) or avatar/thumbnail | Decorative icons with no meaning |
| `rightElement` | The figure the user scans: amount, duration, quantity, or `chevron-right` | Several competing values |
| `tags` | Status the user acts on, from the shared vocabulary | More than 2 tags, or tags that duplicate the icon |
| `label` | A small category label above the title, when it helps grouping | |

- **Keep the item's own status icon** and add extra states (waiting to sync, missing
  data) as tag or description text. Don't replace the status icon (core rule 5.2).
- **Hide empty values.** Build subtitle and description with expressions that drop
  missing parts and separators. Literal `null`, `N/A` or a dangling " · " is a defect.
- **Format values for people:** currency through `numberStyle: currency`, dates
  through the solution's shared date helper, durations as hours and minutes.
- **Use `isContained: true`** for card-like rows in workspaces, and plain rows for
  long scrolling lists. Be consistent within an area.
- **Use list-item `style`** (`isWaitingSync`, `isWarning`, `isError`, `isDisabled`,
  `isStrikeThrough`) for row-level state where it is clearer than a tag. Don't
  combine it with a tag that says the same thing.

## 2. Status tags vocabulary

Define each entity's tag set once (text, colour, icon) in the solution's shared
constants and reuse it. Map ERP statuses onto a small mobile vocabulary.

| Meaning | Example text | Colour |
| --- | --- | --- |
| Not started / scheduled | Scheduled | neutral (`primary` or a palette colour) |
| In progress | In progress / On site | `primary` |
| Needs attention, can continue | Missing signature / Overdue | `warning` |
| Blocked / failed / rejected | Sync failed / Rejected | `negative` |
| Done | Completed / Approved | `positive` |
| Saved on device, not yet sent | Waiting to sync | neutral, or row `style.isWaitingSync` |
| Removed locally, not yet sent | Marked for delete | `warning` |

- Use the same text and capitalisation everywhere. Don't write "Local", "local" and
  "Not Synced" for one meaning.
- Never colour "waiting to sync" red. It is the normal state of offline work.
  Use red only once a sync has failed.
- Don't show a tag for the normal, expected state when every row would carry it.
  That is noise.

## 3. Order, grouping and volume

- **Choose a default sort that matches the job:** schedule by start time, approvals
  by age, activities newest first, items by name. Keep it consistent between similar
  lists.
- **Group when it helps scanning** (`groupBy` or sections): by day for schedules, by
  status for task lists, by category for items.
- **Avoid endless lists for finding work.** Users looking for a specific record
  need search and filters. Endless scrolling suits browsing, which work apps rarely
  do. Keep synced lists to the data the user needs (their assignments, recent
  periods) rather than whole ERP tables.

## 4. Search and filters

- **Make every list over about 15 rows searchable** (`isSearchable: true`). Search
  must match what the user knows: name, number, address, phone, item code. Search
  local data so it works offline.
- **Use quick filters (`filter:` chips) for the 2-5 views users switch between**
  ("Today", "This week", "Open", "All"). The default chip is the most common view.
- **Show the active filter**, and give a no-results state a way back ("No results
  in Open. Show all").
- **Keep the search text and filter** when the user opens a record and comes back.
- **Searchable pickers show Recent or Favourites first**, then the full list.

## 5. Tabular data on a phone

ERP data is tabular, and the phone is narrow. Transform it rather than shrink it.

1. **Cut columns first.** Keep only what the mobile job needs to decide or act on.
2. **Turn rows into list items:** primary column as the title, secondary columns in
   the subtitle or description, the key figure as the right element.
3. **Put drill-down detail on a detail screen or expander**, not in more columns.
4. **Totals go in a `component.summary`** or a section footer, not in a total
   row inside the list.
5. **For true grids (timesheet week, quantities by size), use one row per row
   label and a short value list.** Example: one row per day with hours on the
   right, rather than a 7-column grid. Freeze the label (keep it in the title) if
   values scroll.
6. **Line items:** item description (title), code · UOM (subtitle), qty x price
   (description), line total (right element).

## 6. Swipe actions

- Use swipe only for frequent row actions (delete, copy, quick status change).
  Each one also exists on the record screen or in a menu.
- Give every swipe action a label, a matching icon (Delete = `trash`, never a
  pencil) and a colour that matches its meaning (`negative` for delete).
- Confirm destructive swipes (`action.confirm`) or offer an undo. A swipe delete with
  no confirm is a defect.
- Keep one direction for one meaning across the app.

## 7. Selection and bulk actions

- Offer bulk actions only where the job repeats over many rows with low risk:
  approve timesheets, mark items received, delete drafts.
- Show the number of selected rows and an action that names it ("Approve 4").
- Confirm bulk destructive actions with the count ("Delete 4 draft photos?").

## 8. Pickers (choosing a record or value)

- **The picker row's title is the human name**, and its subtitle is the code plus a
  disambiguating fact ("Main warehouse · WH01").
- **Sort by what users look for:** recent and favourites, then alphabetical. For
  coded lists, sort by code then description, following the `jigx` skill.
- **Picking returns straight to the form** and fills dependent fields. Don't make
  the user confirm a single choice.
- **If the selection was cleared because a parent choice changed** (customer, then
  location), tell the user which field was cleared.
