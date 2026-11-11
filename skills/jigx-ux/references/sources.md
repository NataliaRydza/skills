# Sources

These are the rules in this skill and where they come from. The Jigx-specific rules
come from production solutions and QA. The general rules come from the sources below.
When sources disagree, the skill picks the option that suits frontline, repeated,
offline work, and notes the disagreement where it matters.

## Jigx production experience

- QA feedback and fixes on field-service, sales (opportunities), time and inventory
  solutions. These covered duplicate actions, double-tap duplicates, silent saves,
  missing required-field feedback, raw errors and JSON on screen, literal `null`
  values, misleading unsaved-items warnings, inconsistent discard warnings, false
  offline banners, stale toasts, permanent loading placeholders, calendar ranges, and
  Android back gestures exiting the app.
- Jigx SDK typings (screen, component and action builders) for property names and
  enums, used in `yaml-patterns.md`.

## Platform and accessibility guidelines

- Apple Human Interface Guidelines: accessibility, tab bars, haptics.
  https://developer.apple.com/design/human-interface-guidelines/accessibility
- Android accessibility and navigation patterns.
  https://developer.android.com/guide/topics/ui/accessibility/apps
- WCAG 2.2: target size (2.5.8), dragging (2.5.7), redundant entry (3.3.7),
  focus not obscured (2.4.11), accessible authentication (3.3.8).
  https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- Steven Hoober, touch accuracy by screen region.
  https://www.uxmatters.com/mt/archives/2013/11/design-for-fingers-and-thumbs-instead-of-touch.php

## Research and design systems

- Nielsen Norman Group:
  - response time limits: https://www.nngroup.com/articles/response-times-3-important-limits/
  - skeleton screens: https://www.nngroup.com/articles/skeleton-screens/
  - placeholders in forms: https://www.nngroup.com/articles/form-design-placeholders/
  - form errors: https://www.nngroup.com/articles/errors-forms-design-guidelines/
  - wizards: https://www.nngroup.com/articles/wizards/
  - mobile tables: https://www.nngroup.com/articles/mobile-tables/
  - contextual swipe: https://www.nngroup.com/articles/contextual-swipe/
  - infinite scrolling: https://www.nngroup.com/articles/infinite-scrolling-tips/
  - empty states: https://www.nngroup.com/articles/empty-state-interface-design/
  - dashboards: https://www.nngroup.com/articles/dashboards-preattentive/
  - confirmation dialogs: https://www.nngroup.com/articles/confirmation-dialog/
  - mobile input checklist: https://www.nngroup.com/articles/mobile-input-checklist/
  - push notifications: https://www.nngroup.com/articles/push-notification/
  - onboarding: https://www.nngroup.com/articles/mobile-app-onboarding/
- Luke Wroblewski, inline validation study.
  https://alistapart.com/article/inline-validation-in-web-forms/
- GOV.UK Design System: error messages, question pages, dates, radios.
  https://design-system.service.gov.uk/components/error-message/
- Baymard Institute, drop-down usability. https://baymard.com/blog/drop-down-usability
- Google offline sync design guideline.
  https://developers.google.com/open-health-stack/design/offline-sync-guideline
- web.dev offline UX guidelines. https://web.dev/articles/offline-ux-design-guidelines
- SAP Fiori object page and header guidance (record workspace headers).
  https://www.sap.com/design-system/fiori-design-web/v1-84/page-types/floorplans/object-page/usage
- Salesforce compact layouts (record highlights fields).
  https://developer.salesforce.com/docs/atlas.en-us.218.0.salesforce1.meta/salesforce1/compact_layouts_intro.htm

## Domain products studied

- Field service: Microsoft Dynamics 365 Field Service mobile (agenda, swipe status,
  booking status timestamps, offline guidance), Housecall Pro (On my way / Start /
  Finish), ServiceTitan (good/better/best estimates), Acumatica field service
  (depart/arrive/start/complete, mobile signature), Jobber reviews.
  - https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status
  - https://help.housecallpro.com/en/articles/3971521-how-do-field-techs-use-checklists-on-mobile
  - https://help.servicetitan.com/docs/estimates-and-proposals-in-servicetitan-max
- Time tracking: QuickBooks Time (geofence prompts, switch/break with no gaps),
  Harvest (week grid, duration formats), Clockify (approval, locking, overlaps),
  Timesheet.io (forgotten-timer reminders).
  - https://clockify.me/help/extra-features/lock-timesheets
  - https://support.getharvest.com/hc/en-us/articles/360048181812
  - https://docs.timesheet.io/applications/ios-app/forgotten-timer
- Sales: Salesforce mobile, HubSpot mobile (activity logging), Pipedrive (call logging
  prompt), mobile order-entry practice (offline catalogs, scan-to-add).
  - https://support.pipedrive.com/en/article/calling-and-logging-calls-in-the-mobile-app
- Projects and construction: Procore (daily log, punch list, quick capture), Fieldwire
  (plan tasks, offline projects, numbers assigned on sync), Autodesk Build (quick issue
  creation), Buildertrend reviews.
  - https://help.fieldwire.com/hc/en-us/articles/202631944
- Expenses: Expensify SmartScan (camera-first capture, batch capture).
  https://use.expensify.com/receipt-scanning-app

## Known gaps

There is little independent research on enterprise approval inboxes, search UX
specifics, bulk actions, barcode capture UX and conflict-resolution UI. The rules for
those are synthesis from repeated product patterns, and they are worded as defaults
rather than laws.
