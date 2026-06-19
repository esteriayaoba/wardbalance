# WardBalance Phase 2B — Payment & Parent Experience

## UX Specification

---

## 1. Build Boundary

Phase 2B is the second layer of the admin platform. Build only after Phase 2A is stable.

### In Scope

- Parent portal (mobile-first, PWA-enabled)
- Flutterwave payment link generation + webhook verification
- Bank transfer verification queue (approve / reject / request re-upload)
- Parent invoice view, receipt download
- Automated SMS (Termii) and email reminders (Resend)
- Discount rule engine (conditional, sibling, early payment)
- Student Activity Enrolment (optional fees per student)
- Overdue invoice detection (nightly job)
- CSV / PDF exports for reports
- Payment reconciliation dashboard
- Communication log (WhatsApp, phone, email, SMS, in-person)

### Not in Scope (Deferred to Phase 3+)

- Monnify virtual accounts (auto-reconciliation)
- WhatsApp Business API integration
- Multi-branch support
- Native mobile app
- Payroll, attendance, results modules

---

## 2. Parent Portal

### UX Architecture

Mobile-first. Design base: 390px (iPhone 14). Minimum: 360px.

Responsive — works on mobile and desktop browsers, no app install required.

### Layout

Bottom tab navigation (thumb-reachable):

```
┌──────────────────────┐
│  Top bar: logo | 🔔  │
│                      │
│   Main content       │
│   (cards, lists)     │
│                      │
├──────────────────────┤
│ Wards │ Invoices │ Me│  ← bottom tabs
└──────────────────────┘
```

### Navigation

```
My Wards      — home, all children with combined balance
Invoices      — list of all invoices across all children
Payments      — payment history + upload proof
Receipts      — downloadable PDF receipts
Profile       — contact details, notification preferences
```

### Parent Login

OTP via email or phone. No password.

### UI Patterns

- Card-based layout — one card per child (name, class, balance status)
- Traffic-light badges: 🟢 Paid | 🟡 Partial | 🔴 Overdue
- Large tap targets (min 44px)
- Linear payment upload: one screen, one action
- Full-screen invoice breakdown (large text, no horizontal scroll)
- Native share sheet for receipt download (iOS/Android)
- Pull-to-refresh for balance updates

### Performance Targets

- Combined outstanding balance: visible on first screen, zero taps
- Full invoice breakdown: ≤ 2 taps
- Upload payment proof: ≤ 3 taps from home screen
- Download receipt: ≤ 2 taps

---

## 3. Flutterwave Payment Links

### Flow

```
Bursar generates payment link from invoice
→ Link sent to parent via SMS/email (or shared via WhatsApp)
→ Parent opens link on phone
→ Pays via Flutterwave (card, USSD, bank transfer, mobile money)
→ Webhook received by WardBalance
→ Payment matched to invoice + parent + student
→ Invoice balance updated
→ Receipt generated
→ Parent notified (SMS/email)
```

### Payment Link Generation (Admin)

- From invoice detail page: "Generate Payment Link" button
- Select payment provider (Flutterwave)
- Optional: set link expiry date
- Optional: set partial amount (parent paying in instalments)
- Link copied to clipboard or sent via SMS/email

### Mandates

- Every Flutterwave payment must map to `invoice_id`, `parent_id`, `student_id`, `school_id`
- Never create an unscoped payment
- Webhook must be idempotent — handle duplicate callbacks safely
- Settlement must go through Flutterwave subaccount (school's own account)

---

## 4. Bank Transfer Verification Queue

### Statuses

```
Pending → Approved | Rejected | Request re-upload
```

### Flow

```
Parent uploads payment proof (image or PDF)
→ Payment recorded as "Pending"
→ Bursar opens verification queue
→ Views proof side-by-side with invoice details
→ Approves (moves to "Approved", balance updates)
→ Rejects with reason (moves to "Rejected")
→ Requests re-upload (parent gets notification to submit again)
```

### UX (Desktop Admin)

Split-pane layout:
- Left: payment proof image/PDF
- Right: invoice details (student, amount, balance, fee breakdown)
- Action buttons: Approve / Reject / Request Re-upload
- Keyboard shortcuts for power users (A = approve, R = reject)

### Performance Target

Approve a pending transfer: ≤ 2 clicks.

---

## 5. Parent Invoice View

### Features

- See all invoices for a child (current term, past terms)
- Each invoice shows: status badge, total, balance due, due date
- Tap to expand: full line-item breakdown (fee name, amount, discount, total)
- Download PDF receipt (for approved payments)
- "Pay Now" button (opens Flutterwave checkout — Phase 2B)

### Combined View

The "My Wards" home screen shows all children with:
- Total combined outstanding balance (top)
- Per-child: name, class, outstanding amount, status badge
- Tap a child to see their invoices

---

## 6. Receipt Download

### Receipt Content

- School name, logo, address
- Receipt number (auto-generated, sequential per school)
- Student name, class, admission number
- Term and session
- Payment date, amount, method (bank transfer, card, cash, POS, cheque)
- Transaction reference
- Fee breakdown (line items)
- Balance carried forward (if any)
- Bursar/authorised signature field
- Generated timestamp

### Download

- Parent portal: tap download → native share sheet → save to files / share on WhatsApp
- Admin: download from payment detail or invoice detail
- Batch download: select multiple receipts → export as ZIP

---

## 7. Automated Reminders

### Triggers

| Trigger | Channel | Timing |
|---------|---------|--------|
| Invoice issued | Email | Immediate |
| Payment confirmed | Email + SMS | Immediate |
| Payment overdue (7 days past due) | Email + SMS | Daily at 8am |
| Payment overdue (30 days past due) | Email + SMS | Daily at 8am (escalated tone) |
| Receipt available | Email + SMS | Immediate |
| Payment link sent | SMS | Immediate |

### SMS Provider

Termii. Template-based messaging with dynamic variables.

### Email Provider

Resend. HTML templates with school branding.

### Opt-Out

Each parent can opt out of SMS or email from their profile. Invoice-issued emails are mandatory (can't opt out).

---

## 8. Discount Rule Engine

### Rule Types

| Type | Logic | Example |
|------|-------|---------|
| Fixed | Flat naira off | ₦10,000 off tuition |
| Percentage | % off total or specific fee item | 10% off tuition |
| Sibling count | % discount increases with number of siblings | 2nd child: 10%, 3rd child: 15% |
| Early payment | % off if paid before due date | 5% off if paid by March 1st |
| Staff | Flat naira off for staff children | 50% off tuition |

### Rule Definition (Admin)

- Discount rule CRUD in Fee Structure → Discounts
- Each rule has: name, type, value, conditions, applicable fee items, applicable class levels
- Conditional rules: sibling_count threshold, early_payment date
- Rules can be `active` or `inactive`

### Auto-Application

- When generating invoice, system checks applicable rules
- Sibling discount: auto-applied when parent has multiple enrolled children
- Early payment: checked at payment time, discount applied if before cutoff

---

## 9. Student Activity Enrolment

### Concept

Optional fee items (e.g. STEM Club, Football, Swimming) that are assigned per student per session, not to an entire class.

### Flow (Admin)

```
Open student profile → Activities tab
→ Browse available optional fee items
→ Enrol student (select item, set term)
→ Fee item appears on student's next invoice
```

### Data Model

`StudentActivityEnrolment` links a student to an optional `FeeItem` for a specific session.

---

## 10. Overdue Invoice Detection

### Nightly Job

- Runs daily at 2am (BullMQ cron job)
- Checks all invoices where `status = 'issued'` or `status = 'partial'`
- If `due_date` is past and `balance_due > 0`, mark status as `overdue`
- Writes AuditLog entry for each status change
- Triggers overdue notification (SMS/email) if parental notifications are enabled

### Invoice Status Flow

```
draft → issued → partial → paid
                 ↓
              overdue  (nightly job: due_date passed, balance_due > 0)
```

---

## 11. CSV / PDF Exports

### Admin Reports Export

Every Phase 2A report gains an export button:
- **CSV**: Export current filtered view (all rows, not just page)
- **PDF**: Export formatted report (school branding, date range, summary header)

### Build With

- CSV: `csv-writer` (server-side, API route returns file)
- PDF: `@react-pdf/renderer` (client-side) or Puppeteer (server-side for batch)

### Exportable Reports

- Revenue summary (session/term)
- Outstanding balance (per student)
- Debtors list (with filters)
- Class collection summary

---

## 12. Payment Reconciliation Dashboard

### KPIs

- Total payments today/this week/this term
- Payments by method (bank transfer, card, cash, POS, cheque)
- Payments by status (pending verification, approved, rejected, void)
- Verification queue count (current pending)
- Failed transactions (Flutterwave declines/timeouts)
- Average verification time (hours from submission to approval)

### Verification Queue Widget

Dashboard widget showing:
- Number of pending verifications
- "Oldest pending" timestamp
- CTA: "Review Queue" — opens verification queue

---

## 13. Communication Log

### Data Model

Each entry has:
- Date/time
- Channel (WhatsApp, Phone call, Email, In-person, SMS)
- Message type (payment reminder, invoice notification, receipt notification, general)
- Staff member (who logged it)
- Notes (free text)
- Linked to: student, parent, invoice (optional)

### UI

- Tab on parent profile: "Communication Log"
- List view (most recent first)
- Filter by channel, date range, staff member
- Add entry button (manual, for phone calls/in-person)

---

## 14. PWA Support (Parent Portal Only)

### Requirements

- `manifest.json` with app name, icons, theme colour (`#0f172a`)
- Service worker for offline balance caching
- "Add to Home Screen" prompt after second visit
- Push notifications for payment confirmations and fee reminders

### Exclusions

Do **not** add PWA to the Admin Platform.

---

## 15. Sprint Plan (Provisional)

| Sprint | Scope | Key Deliverables |
|--------|-------|------------------|
| 1. Parent portal foundation | Auth (OTP), My Wards dashboard, invoice list view, profile | Parent logs in, sees children and balances |
| 2. Payment upload & verification | Upload proof UI, verification queue (split-pane), approve/reject/re-upload flow, status notifications | Parent uploads proof, bursar verifies |
| 3. Flutterwave integration | Payment link generation, webhook handling, idempotency, settlement tracking | Automated online payments work end-to-end |
| 4. Receipts & notifications | PDF receipt generation, download, email/SMS triggers, overdue job | Receipts downloadable, reminders fire automatically |
| 5. Discounts, activities & exports | Discount rule engine, activity enrolment, CSV/PDF exports, communication log | Full fee flexibility, report exports |
| 6. Dashboard & polish | Payment reconciliation dashboard, PWA, performance optimisation, edge cases | Feature-complete Phase 2B |

---

## 16. Permission Matrix Additions

| Action | Owner | Principal | Bursar | Admin |
|--------|:-----:|:---------:|:------:|:-----:|
| Create discount rules | Yes | View | Yes | No |
| Manage activity enrolments | Yes | View | Yes | Limited |
| View verification queue | Yes | View | Yes | No |
| Approve/reject payments | Yes | No | Yes | No |
| Export reports | Yes | Yes | Yes | No |
| Manage communication log | Yes | No | Yes | Yes |
| Send manual reminders | Yes | No | Yes | Yes |

---

*This spec is aligned with AGENTS.md. Do not begin Phase 2B until Phase 2A is stable and deployed.*
