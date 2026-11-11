# Jigx YAML Patterns For UX

These shapes are verified against the Jigx SDK (`jigx-sdk/packages/sdk/src`) and against
production solutions. Copy them rather than guessing property names. Names, IDs and
URLs here are examples.

The patterns marked **(runtime-only)** are used in production YAML but are missing from
some SDK typings. Confirm that the target app runtime renders them before relying on
them. When an SDK builder exists, prefer it and inspect the generated YAML.

## Screen skeleton (list with header, search, filter, refresh, placeholders)

```yaml
title: Appointments
type: jig.list
icon: list

header:
  type: component.jig-header
  options:
    height: small
    children:
      type: component.image
      options:
        source:
          uri: https://images.jigx.com/frontline/tools.jpg   # registered in assets/images.jigx

isSearchable: true
filter:
  - title: Today
    value: today
  - title: This week
    value: week
  - title: All
    value: all

placeholders:
  - title: Loading appointments
    icon: loading-data
    when: =@ctx.jig.state.loading = true        # declared in state:, set by the load action
  - title: No appointments today. Pull to refresh or choose This week.
    icon: missing-data
    when: =$count(@ctx.datasources.appointments) = 0

onRefresh: &screenRefresh
  type: action.sync-entities
  options:
    provider: DATA_PROVIDER_REST
    entities:
      - entity: appointments
        function: rest-get-appointments
```

- Placeholder `icon` is a fixed set: `loading-data`, `missing-data`, `is-offline`,
  `scan-qr`, `helicopter`, `oil-drop`. Use `is-offline` for "needs a connection".
- Placeholders are conditional (`when:`). Make the loading, empty and offline
  conditions mutually exclusive so the right one shows.
- Reuse the refresh action (YAML anchor `&screenRefresh` / `*screenRefresh`) for a header
  refresh button, so both run the same work. Choose the `provider` and entities your
  solution actually syncs.

## List item: anatomy, status, tags, value, swipe

```yaml
item:
  type: component.list-item
  options:
    isContained: true
    title: =@ctx.current.item.customerName
    subtitle: =@ctx.current.item.appointmentNbr & ' · ' & @ctx.current.item.timeWindow
    description: =@ctx.current.item.address
    numberOfLines: 2
    leftElement:
      element: icon
      icon: =@ctx.current.item.statusIcon        # every possible value registered in assets/icons.jigx
      isDuotone: true
      color: =@ctx.current.item.statusColor      # positive | negative | warning | primary | color1..14
    rightElement:
      element: value
      text:
        text: =@ctx.current.item.total
        format:
          numberStyle: currency
          currency: USD
    tags:
      - text: Waiting to sync
        color: color3                           # neutral palette colour, never negative
        when: =@ctx.current.item.syncState = 'pending'
    style:
      isWaitingSync: =@ctx.current.item.syncState = 'pending'
    onPress:
      type: action.go-to
      options:
        linkTo: view-appointment
        inputs:
          appointmentId: =@ctx.current.item.id
    swipeable:
      left:
        - label: Delete
          icon: trash
          color: negative
          onPress:
            type: action.confirm
            options:
              isConfirmedAutomatically: false
              modal:
                title: Delete this draft line?
                description: It hasn't been sent yet and will be removed from this device.
                confirm: Delete line
                cancel: Keep
              onConfirmed:
                type: action.execute-entity
                options:
                  provider: DATA_PROVIDER_LOCAL
                  entity: appointment-lines
                  method: delete
                  data:
                    id: =@ctx.current.item.id
```

- List-item `style` flags: `isWaitingSync`, `isWaiting`, `isWarning`, `isError`,
  `isPositive`, `isDisabled`, `isStrikeThrough`, `isHighlighted`.
- `numberOfLines` takes a number or `dynamic`. Prefer a cap in long lists.
- Check whether `when` on an individual tag is supported in the target runtime. If not,
  build the `tags` array with an expression that only includes the applicable tags.
  Don't emit tags with empty text.
- Use the provider and delete pattern your solution uses for its local tables (see the
  `jigx` skill).

## Record context: entity fields with tap-to-call and navigate

```yaml
- type: component.entity
  options:
    children:
      - type: component.entity-field
        options:
          label: Customer
          value: =@ctx.datasources.appointment.customerName
      - type: component.entity-field
        options:
          label: Phone
          value: =@ctx.datasources.appointment.phone
          contentType: phone
      - type: component.entity-field
        when: =$boolean(@ctx.datasources.appointment.notes)    # hide empty rows
        options:
          label: Notes
          value: =@ctx.datasources.appointment.notes
          isMultiline: true
```

`contentType` values: default, email, phone, link, date, time, checkbox, signature, copy,
qrcode. Use `action.open-map` for navigation to an address.

## Summary (one key figure on a record)

```yaml
summary:
  children:
    type: component.summary
    options:
      layout: default            # default | counter | cart
      leftIcon:
        element: icon
        icon: coin
        isDuotone: true
      title:
        text: =$sum(@ctx.datasources.lines.lineTotal)
        format:
          numberStyle: currency
          currency: USD
      subtitle: =$count(@ctx.datasources.lines) & ' lines'
```

## Bottom action panel: one main action, state-driven, double-tap safe

```yaml
state:
  completing:
    initialValue: false

placeholders:
  - title: Completing appointment
    icon: loading-data
    when: =@ctx.jig.state.completing = true

actions:
  - numberOfVisibleActions: 1
    children:
      - type: action.action-list
        options:
          title: Complete
          icon: check
          isHidden: =@ctx.datasources.appointment.status != 'InProgress'
          style:
            isPrimary: true
            isDisabled: =@ctx.jig.state.completing = true
          isSequential: true
          actions:
            - type: action.set-jig-state
              options:
                changes:
                  completing: true
            # ... local save / queue work ...
            - type: action.set-jig-state
              options:
                changes:
                  completing: false
            - type: action.go-back
```

- Create **one** action group per screen and add children to it. The runtime uses only
  the first group whose `when` is true (see the `jigx` skill, Bottom Actions).
- Declare every jig state key in `state:` before setting it.
- `style.isDanger: true` marks a destructive action. There is no `danger` colour.
- Make sure the busy flag is reset on every path, including the failure path, or the
  screen stays locked.

## Confirm dialog

```yaml
- type: action.confirm
  options:
    isConfirmedAutomatically: false
    modal:
      title: Discard 3 photos?
      description: These photos haven't been added yet. Discarding removes them from this device.
      confirm: Discard
      cancel: Keep
    onConfirmed:
      type: action.action-list
      options:
        isSequential: true
        actions: []
```

`isConfirmedAutomatically` can be an expression. Use it to skip the dialog when nothing
would be lost (for example, no unsaved items).

## Discard warning on leave

Form-level, bound to dirty state. Set it explicitly, because the default is off:

```yaml
- type: component.form
  instanceId: timeEntryForm
  options:
    isDiscardChangesAlertEnabled: =@ctx.components.timeEntryForm.state.isDirty
    children: []
```

Jig-level, when the "changed" test is more than one form:

```yaml
canGoBack:
  when: =@ctx.jig.state.hasChanges = false
  confirm:
    title: Discard changes?
    description: Your changes to this time entry will be lost.
    confirm: Discard
    cancel: Keep editing
```

`canGoBack.when` is true when leaving is allowed **without** asking.

## Info modal (must-read before continuing, e.g. offline)

```yaml
- type: action.info-modal
  when: =@ctx.system.isOffline
  options:
    modal:
      title: You're offline
      description: Refresh needs a connection. You can keep working, and changes will sync later.
      buttonText: OK
      element:
        type: icon
        icon: wifi-off
```

## Toast (runtime-only `action.show-alert`)

```yaml
- type: action.show-alert
  options:
    title: Saved on this device
    description: It will sync when you're online.
    presentAs: toast          # toast | modal
    icon: cloud-up
    style:
      isPositive: true        # or isNegative
    dismiss:
      isEnabled: true
      autoAfter: 3
    group:
      id: save-feedback       # same id replaces the previous toast
```

## Banner (runtime-only `component.banner`)

```yaml
children:
  - type: component.banner
    when: =$exists(@ctx.datasources.recordSyncError.id)
    options:
      title:
        text: Appointment needs attention
        isBold: true
      subtitle: =@ctx.datasources.recordSyncError.userMessage    # plain words, never the raw payload
      leftElement:
        element: icon
        icon: alert-triangle
      style:
        isNegative: true      # or isWarning
```

## Badge for counts that need attention

```yaml
badge: =$count(@ctx.datasources.syncIssues)
```

## Field options worth knowing

- Shared field options include `label`, `helperText`, `errorText`, `isRequired`,
  `isOptionalLabelHidden`, `keyboardType`, `isAutoFocused`, `nextProperty`, `icon`,
  `color`, `isBusy` and `style: {isDisabled: ...}`.
- Form state: `@ctx.components.<form>.state.isDirty`, `.isValid` and `.data`.
- Date picker: `mode: date | time | datetime`, `minimum`, `maximum`, `format`.
- Number field: `minimum`, `maximum`, `stepper`, `format`.
- Duration picker: `hours`, `minutes`, `step`, `initialValue`.
- Section: `title`, `subtitle`, `icon`, `isCollapsible`, `isExpanded`.

## Formatting

- Numbers: `format: {numberStyle: currency | decimal | percent | unit, currency: USD, unit: hour}`.
- Dates: use the solution's shared date helper or expression. If a component `format`
  is needed, use moment-style tokens (`L`, `LL`, `ll`, `lll`, `LT`) consistently, and
  never a one-off pattern on a single screen.

## Icons and images

- `assets/icons.jigx`: `icons: [plus, alert-triangle, chevron-right, trash, wifi-off, cloud-up]`.
- `assets/images.jigx`: `images: [<header image URLs>]`.
- Current solutions use Tabler outline icon names (for example `alert-triangle`,
  `chevron-right`, `trash`, `wifi-off`, `cloud-up`, `coin`, `clipboard-text`). Check
  names with `scripts/check-icons.mjs --name ...`, migrate legacy Streamline names with
  the icon-migration skill (`icons.md`), and register every icon that comes from data or
  expressions (core rule 1.3).
