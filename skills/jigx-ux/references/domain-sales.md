# Domain Playbook: Sales, CRM And Order Entry

This playbook is for accounts, contacts, activities, opportunities, quotes and sales
orders. The user's jobs are to find the customer fast, understand the context before a
visit, log a call or visit in seconds, build a quote or order on site with the right
prices, get a signature, send it, and do all of it offline.

## 1. Screen structure

```text
Home (sales)           today's visits/activities, open opportunities, quick actions
Accounts list          search by name/number/city/phone
  └─ Account workspace header: name, status/credit, balance, primary contact (call/email/navigate)
       ├─ Activity     recent calls/visits/notes + Log activity
       ├─ Opportunities stage, amount, close date
       ├─ Quotes & orders number, date, total, status
       └─ Contacts     name, role, call/email
Opportunity workspace  header: name, account, stage, amount, close date
  ├─ Items             lines with qty, price, total; summary total
  ├─ Activity / notes
  └─ Photos & documents
Quote / order editor   customer → lines → review totals → sign → submit
```

## 2. Finding the customer

- **Search matches what the rep knows:** name, account number, city, phone, contact
  name. It searches local data first, so it works offline.
- **Recent accounts come first** in pickers and on the accounts list.
- **Account rows show** name (title), number · city (subtitle), and balance or last
  order date (right element). Add a credit hold or overdue tag only when it applies
  (`warning` / `negative`).

## 3. Account workspace

- **The header shows what matters before the visit:** status, credit hold, overdue
  balance, last order, and the primary contact with call, email and navigate.
- **Warn early.** A credit hold or overdue balance appears in the header as a banner
  *before* the rep starts an order, not as an error at submit.
- **Related lists show counts** ("Opportunities (3)") and the most recent items
  first.

## 4. Logging activities

- **Make logging reachable from anywhere** (home quick action, account, opportunity).
  From home, it first asks for the account, with recent accounts on top.
- **Keep the form minimal:** type (segmented or choice: Call, Visit, Email, Note),
  outcome, a short note, and an optional follow-up date. The date and time default to
  now and the account and contact come from context.
- **Prompt after the event.** After a call made from the app or a visit
  completed, offer "Log this call?" with the type and time prefilled.

## 5. Opportunities

- **Rows show** name (title), account (subtitle), stage tag, amount (right element) and
  close date. Overdue close dates get a `warning` tag.
- **Changing the stage is quick** (choice or dropdown on the record), and a stage that
  needs more data (lost reason, win amount) asks only for that.
- **Show "Waiting to sync"** on opportunities created offline, with a temporary label
  instead of a fake number.

## 6. Quote and order entry

- **Adding items:** search (code, description, barcode), scan, reorder from the last
  order, or pick from favourites. A scan adds the line, and scanning again
  increments the quantity.
- **Item search rows show** description (title), code · UOM (subtitle), and the
  customer price plus availability (right or description). Availability shows its
  freshness when it comes from the last sync.
- **Lines show** description, qty x unit price, discount if any, and the line total.
  Quantity is edited inline or with a stepper and numeric keypad.
- **The total stays visible:** `component.summary` with subtotal, discount, tax and
  order total (`layout: cart` where it fits) while lines are edited.
- **Pricing is never manual by default.** The customer price list, contract prices and
  discount rules apply automatically. Manual price or discount is an explicit,
  optional control (`isRequired: false`), with the reason recorded if the business needs
  one.
- **Estimates are labelled as estimates.** If the price or tax is calculated locally
  and confirmed by the ERP later, say so ("Estimated total. Confirmed after sync").
- **Defaults come from the customer:** warehouse, terms, ship-via, branch. Don't ask
  for them unless the rep often changes them.
- **Review before submit:** a summary of lines and totals, then the customer signature
  (when used), then Submit. Submit confirms only if it sends to the customer or the
  ERP and can't be undone.
- **The quote PDF is generated on the device** and shown in `jig.document` with Share.
  Sending is queued when offline and labelled that way.

## 7. Fields to surface

| Where | Fields |
| --- | --- |
| Account row | Name, number, city, balance / last order, credit tag |
| Opportunity row | Name, account, stage, amount, close date |
| Quote/order row | Number (or "Draft"), customer, date, total, status / sync tag |
| Line row | Description, code · UOM, qty x price, line total |
| Order summary | Subtotal, discount, tax, total |

## 8. Pitfalls

- Activities can only be logged from deep inside a record.
- Prices or discounts calculated by hand on the phone.
- Order entry blocked offline because live stock or price isn't reachable. Show
  cached values with their freshness instead.
- Required fields that the customer record could have defaulted.
- Totals hidden at the bottom of a long line list.
- "Order sent" shown when the order was only queued.
