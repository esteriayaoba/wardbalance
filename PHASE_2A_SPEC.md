# WardBalance Phase 2A — Admin Platform Foundation

## UX Specification

---

## 1. Build Boundary

Phase 2 is split into two levels.

### Phase 2A — Admin Platform Foundation (Build Now)

**In scope:**
- Auth-aware admin shell (NextAuth.js, email invitation + password)
- School tenant creation from approved lead
- Setup checklist wizard (12 steps, dependency-aware)
- Academic session and term management (including term locking)
- Division, class level, and class arm CRUD
- Student management (list, add, import CSV/XLSX)
- Parent management (list, add, import CSV/XLSX)
- Parent-to-ward linking (relationship type, primary contact, notification recipient)
- Fee item library (mandatory + optional, billing frequency)
- Class fee templates per term
- Bulk invoice generation wizard with batch preview and duplicate prevention
- Invoice list and detail with fee breakdown
- Manual payment recording (cash, bank transfer, POS, cheque)
- Basic receipt record on payment approval
- Dashboard (6 KPIs, setup-first empty state)
- Reports (revenue summary, outstanding balance, debtors list, class collection)
- Audit log (read-only, filterable)
- Permission-aware UI + backend enforcement

### Phase 2B — Payment & Parent Experience (Build After)

- Full parent portal (mobile-first)
- Flutterwave payment link generation + webhook verification
- Bank transfer verification queue (approve/reject/re-upload)
- Parent invoice view, receipt download
- Automated SMS (Termii) and email reminders
- Discount rule engine (conditional/sibling)
- Student Activity Enrolment
- Overdue invoice detection (nightly job)
- CSV/PDF exports, advanced reports
- PWA support for parent portal

---

## 2. Lead-to-School Conversion

### Flow

```
Lead submits early access form  →  Lead stored in DB
→  Team reviews lead (manual)
→  Lead approved for pilot
→  School tenant created from lead data
→  First admin user invited
→  Owner completes setup checklist
```

### School Statuses

```
lead → approved → invited → onboarding → active → paused | archived
```

Never auto-activate a school from a marketing form submission.

### Minimum Fields for School Creation

| Field | Required | Source |
|-------|----------|--------|
| School name | Yes | Lead form |
| Owner name | Yes | Lead form |
| Owner email | Yes | Lead form |
| Phone number | Yes | Lead form |
| Estimated students | Yes | Lead form |
| School address | No | Lead form |
| Pilot status | Auto | Internal |
| Setup status | Auto | Default: `invited` |

---

## 3. Auth & First Login

### Auth Strategy
- **Admins** — password-based via email invitation. Set password on first login, then email + password.
- **Parents** (Phase 2B) — OTP via email or phone; no passwords.

### First Login Flow

```
User receives invite email
→ Opens invite link (validated, time-limited token)
→ Sets password
→ Confirms school name (prefilled from lead)
→ Lands on setup checklist
```

### First Login Screen
- WardBalance logo
- School name
- Welcome message: *"Welcome to WardBalance. You have been invited to set up your school's financial workspace. Create your password to continue."*
- Password form + confirmation
- Terms/Privacy acknowledgement
- Continue button

### Hard Rule
Never land a new owner on an empty dashboard. Always redirect to the setup checklist.

---

## 4. Setup Checklist

The checklist is the center of the first admin experience. Accessible from sidebar until completed.

### 12 Required Steps (Ordered)

```
 1. Complete school profile
 2. Create academic session
 3. Create academic term
 4. Create divisions
 5. Create class levels
 6. Create class arms
 7. Add or import students
 8. Add or import parents
 9. Link parents to wards
10. Create fee items
11. Create class fee templates
12. Generate first invoices
```

### Step States

```
Not started | In progress | Completed | Skipped | Needs attention
```

### Each Item Shows
- Step title
- Short description (1–2 sentences)
- Status badge
- Contextual CTA (Start / Continue / View / Edit)
- Dependency note if blocked

**Example:**
> **Create class fee templates**
>
> Define what each class should pay this term.
>
> Status: Not started
>
> Blocked until:
> - Academic term is created
> - Class levels/class arms are created
> - Fee items are created
>
> [Create Fee Template]

### Dashboard Empty State

When setup is incomplete:

> Your finance dashboard is almost ready. Complete your school setup to start generating invoices and tracking payments.

CTA: `Continue Setup`

---

## 5. Academic Structure

### Hierarchy

```
School
 └── Division          (Nursery | Primary | Secondary)
      └── ClassLevel   (e.g. JSS1, Primary 4)
           └── ClassArm (e.g. JSS1A, JSS1B)
                └── Student
```

### Rules
- Divisions, levels, and arms are CRUD-managed by School Owner/Admin
- A class arm belongs to exactly one class level
- A class level belongs to exactly one division
- Deleting a division cascades cleanup through levels and arms (with confirmation)

---

## 6. Student & Parent Management

### Student Fields
| Field | Required | Notes |
|-------|----------|-------|
| First name | Yes | |
| Last name | Yes | |
| Admission number | Yes | Unique per school |
| Class level | Yes | Must exist |
| Class arm | Yes | Must exist under level |
| Status | Yes | `active`, `graduated`, `transferred`, `suspended` |
| Gender | No | |
| Date of birth | No | |
| Parent name | No | For convenience during import |
| Parent phone | No | Nigerian mobile validation |
| Parent email | No | |

### Parent Fields
| Field | Required | Notes |
|-------|----------|-------|
| First name | Yes | |
| Last name | Yes | |
| Phone number | Yes | Nigerian mobile format |
| Email | No | |
| Address | No | |

### Parent-to-Ward Linking

**Flow:** Open student profile → Parent/Guardian tab → Search existing parent or create new → Select relationship type → Set primary contact → Set notification recipient → Save

**Relationship types:** Mother, Father, Guardian, Sponsor, Other

**Link fields:**
- Parent (reference)
- Student (reference)
- Relationship type
- Primary contact (boolean, exactly one per student)
- Receives invoice notifications (boolean)

### Warning for Unlinked Students

If a student has no linked parent, show a visible banner on the student profile and in student lists:

> No parent linked — this student can receive invoices, but no parent will be available for payment communication until one is linked.

---

## 7. Data Import (CSV/XLSX)

Build import flows for students and parents in Phase 2A. Defer parent-ward linking imports and fee imports to Phase 2B.

### Import Flow

```
1. Upload CSV/XLSX file
2. Map source columns → system fields
3. Preview first 20 rows
4. Show per-row validation errors
5. Confirm import or fix and retry
6. Show summary
```

### Validation Errors (Examples)

```
Admission number is missing.
Class arm "JSS1C" does not exist.
Duplicate admission number "ADM-0234" found.
Parent phone number is invalid (must be Nigerian mobile).
```

### Summary Example

```
Import completed

120 students imported
  8 records skipped (show reasons)
  5 records need review (show reasons)
```

**Hard rule:** Never import invalid rows silently. Always show what failed and why.

---

## 8. Fee Setup

### Fee Item Library

- School-level catalogue of all fee items
- Each item has: name, description, type (`mandatory` | `optional`), billing frequency (`per_term` | `per_session` | `one_off`), amount (Decimal)
- CRUD by School Owner or Bursar

### Class Fee Templates

- Assigns mandatory fee items to a class-level + term combination
- Optional: set a fixed override amount per item (instead of the library default)
- Template status: `draft` → `published`
- Only published templates appear in invoice generation

---

## 9. Invoice Generation

### Flow

```
Select session & term
→ Select class/class arm
→ Select fee template
→ Select students (bulk or individual)
→ Apply discounts (fixed/percentage)
→ Preview batch
→ Confirm and generate
```

### Batch Preview Shows
- Session, term, class/class arm
- Number of students selected
- Fee template selected
- Total expected revenue
- Students excluded with reasons
- Sample invoice preview

### Warning Examples

```
3 students have no linked parent.
2 students already have invoices for this term.
1 student has no class arm.
```

### Duplicate Prevention
Block generation if a student + session + term + template combination already exists. Allow override only by School Owner with explicit confirmation.

### Carryover
When generating Term N invoices, check each student's Term N−1 invoice. If `balance_due > 0`, add a line item `line_type = 'carryover'` labelled "Previous Term Balance".

---

## 10. Discount Application

### Supported in Phase 2A
- **Fixed** — flat naira amount off invoice total
- **Percentage** — % off invoice total or specific fee item

### Deferred to Phase 2B
- Conditional discounts (sibling_count, early_payment)
- Discount rule engine with auto-application
- Discount reports

---

## 11. Manual Payments

### Strategy
Manual-payment-first. No Flutterwave production settlement in Phase 2A.

### Allowed Methods
Cash, Bank transfer, POS, Cheque

### Payment Statuses
`Recorded` → `Void` (no approval workflow yet)

### Each Payment Must Be Tied To
- School (`school_id`)
- Invoice (`invoice_id`)
- Student (`student_id`)
- Parent (`parent_id`)
- Amount
- Payment method
- Actor who recorded it

### Post-Payment
- Invoice balance recalculated automatically (`balance_due = final_amount − amount_paid`)
- Receipt record created
- Audit log entry written in same Prisma transaction

---

## 12. Dashboard (Phase 2A)

### KPIs
- Total invoices generated
- Expected revenue (sum of `final_amount`)
- Collected revenue (sum of approved payment amounts)
- Outstanding balance (expected − collected)
- Students without linked parents (count, drillable)
- Pending setup steps

### Empty State
If setup checklist is incomplete, show only the setup-first banner with `Continue Setup` CTA.

---

## 13. Reports (Phase 2A)

Build these only:
- **Revenue summary** — expected, collected, outstanding by session/term
- **Outstanding balance report** — per student, drillable to invoice
- **Debtors list** — filterable by class arm, division, term
- **Class collection summary** — per class arm, aggregated

Defer: discount reports, payment method reports, trend comparison, forecasting, CSV/PDF exports, parent statement PDF.

---

## 14. Permission Matrix

### Roles

| Role | Description |
|------|-------------|
| School Owner | Full access, can invite users, override financial actions |
| Principal | View-only on financial modules, dashboard + reports access |
| Bursar | Full financial ops: fees, invoices, payments |
| Admin | Academic and people ops: students, parents, classes |

### Matrix

| Action | Owner | Principal | Bursar | Admin |
|--------|:-----:|:---------:|:------:|:-----:|
| View dashboard | Yes | Yes | Yes | Limited |
| Manage school settings | Yes | No | No | Limited |
| Invite users | Yes | No | No | No |
| Manage academic setup | Yes | View | No | Yes |
| Add/edit students | Yes | View | No | Yes |
| Add/edit parents | Yes | View | No | Yes |
| Link parents to wards | Yes | View | No | Yes |
| Create fee items | Yes | View | Yes | No |
| Create fee templates | Yes | View | Yes | No |
| Generate invoices | Yes | View | Yes | No |
| Void invoices | Yes | No | Limited | No |
| Record manual payments | Yes | No | Yes | No |
| Void payments | Yes | No | Limited | No |
| View reports | Yes | Yes | Yes | Limited |
| Export reports | Yes | Yes | Yes | No |
| View audit logs | Yes | Yes | Yes | No |

### Enforcement
- Frontend hides unavailable actions by role
- **Backend enforces all restrictions independently**
- "Limited" = view data only, no create/edit/delete
- "View" = read-only module access
- First user defaults to School Owner

---

## 15. Communication UX Foundation

Do not build full automation yet. Add placeholder actions:
- "Send reminder" button (no-op)
- "Copy payment message" — copies WhatsApp-friendly text:

  > Good day Mrs. Adeola, this is a reminder that David Johnson has an outstanding school fee balance of ₦80,000 for 2026/2027 First Term. Kindly contact the school bursar for payment details. Thank you.

- Communication log placeholder on parent profile (date, channel, type, staff, notes)
- Channels: WhatsApp, Phone call, Email, In-person, SMS

---

## 16. Sprint Plan

| Sprint | Scope | Key Acceptance Criteria |
|--------|-------|------------------------|
| 1. Platform shell & onboarding | Admin shell, sidebar, header, setup checklist, school profile, sessions/terms, settings | Owner lands on checklist; progress persists; profile save/retrieve works |
| 2. Academics, students, parents | Divisions/levels/arms CRUD, student list + add, parent list + add, parent-ward linking, profile shells | Students in class arms; parents searchable; multi-ward linking works; unlinked students flagged |
| 3. Fees & invoices | Fee items CRUD, class templates, invoice wizard, batch preview, duplicate prevention, list, detail | Published templates generate invoices; duplicates blocked; preview shows line items |
| 4. Manual payments & receipts | Payment form, list, detail drawer, balance recalculation, receipt creation, audit log | Bursar records payment; balance updates; receipt created; action logged |
| 5. Dashboard, reports, audit | 6 KPIs, setup-first empty state, revenue summary, outstanding report, debtors list, class summary, audit log table | Dashboard reflects real data; reports filterable; debtors list accurate; audit read-only |

---

## 17. UX Patterns — Admin Platform

- **Design base:** 1440px; min supported: 1280px
- **Layout:** Fixed sidebar (240px) + top bar + scrollable content area
- **Data tables:** Sortable columns, filters, pagination, bulk checkboxes
- **Forms:** Multi-step wizards for complex flows (invoice generation, import)
- **Modals/drawers:** Payment detail, parent linking
- **Navigation:** Dashboard, Students, Parents, Fee Structure, Invoices, Payments, Reports, Settings

---

## 18. Naira Formatting

Always `₦120,000` with thousands separator. Never `N120000` or plain `120000`.

---

*This spec is aligned with AGENTS.md and supersedes any conflicting prior Phase 2 drafts.*
