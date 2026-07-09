# WardBalance — Agent Instructions

> Place this file at the root of your project repo. Antigravity reads it automatically
> as a workspace-level rule file alongside any `GEMINI.md` you create.
> Keep it updated as the project evolves — it is the agent's single source of truth.

---

## 1. What This Product Is

**WardBalance** is a multi-tenant B2B SaaS **School Financial Operating System** built for
Nigerian (and wider African) private schools.

It is **not** a payment app, accounting package, CBT system, or learning platform.
It is the operational financial backbone schools currently lack — replacing WhatsApp
confirmations, paper receipts, and Excel ledgers with structured, invoice-based
digital infrastructure.

**One-line pitch:**
> "WardBalance helps Nigerian private schools track who has paid, how much, and what is
> still owed — at WhatsApp-level simplicity."

---

## 2. Product Phase

**Current phase: Phase 2B — Payment & Parent Experience**

| Phase | Status | Scope |
|-------|--------|-------|
| Phase 1 — MVP | ✅ Complete | Marketing landing page, lead capture form, lead database, email notification |
| Phase 2A — Admin Platform Foundation | ✅ Complete | Auth-aware admin shell, school tenant setup, setup checklist, academic structure, students & parents, fee items & templates, invoice generation, manual payments, basic receipts, basic dashboard, audit log |
| Phase 2B — Payment & Parent Experience | ✅ Complete | Parent portal, Flutterwave payment links, verification queue, parent invoice view, receipt download, automated reminders, CSV/PDF exports, lifecycle automation engine, PWA support |
| Phase 3 — Expand | Future | WhatsApp integration, multi-branch support, native mobile app (conditional on PMF data) |
| Phase 4 — Platform | Future | Attendance, results, payroll, full school OS |

**Do not build Phase 3+ features unless explicitly instructed.** If a task seems
to require Flutterwave production settlement, flag it — Phase 2B manages automated
payment links, but manual payment recording (Phase 2A) remains supported.

---

## 3. Tech Stack

Always use these technologies. Do not suggest alternatives unless asked.

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript — strict mode always on |
| UI | shadcn/ui + Tailwind CSS |
| State (server) | TanStack Query v5 (React Query) |
| State (client) | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| File upload | react-dropzone with presigned URLs direct to R2 |
| PDF (client) | @react-pdf/renderer |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v20 LTS |
| API | Next.js API Routes (monorepo); Hono.js for edge-heavy paths |
| ORM | Prisma ORM |
| Auth | NextAuth.js v5 or Clerk |
| Background jobs | BullMQ (backed by Upstash Redis) |
| PDF (server) | Puppeteer or pdfkit for branded receipt generation |
| Validation | Zod — shared schemas between frontend and backend |
| CSV export | csv-writer |

### Infrastructure
| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL 16 |
| DB hosting | Supabase (primary) or Neon |
| File storage | Cloudflare R2 (zero egress fees — important for receipts) |
| Cache / queues | Upstash Redis |
| Frontend hosting | Vercel |
| Backend hosting | Railway or Render |
| CDN / DNS | Cloudflare |
| CI/CD | GitHub Actions |
| Error tracking | Sentry |
| Analytics | PostHog |

### Nigerian Integrations
| Service | Phase | Provider |
|---------|-------|---------|
| SMS | 2B (required) | Termii |
| Email | 1 | Resend |
| Payments (manual) | 2A | Cash, bank transfer, POS, cheque — recorded manually |
| Payments (automated) | 2B | Flutterwave payment links + webhook verification |
| Payments (reconciliation) | 2B+ | Monnify virtual accounts — **not in scope yet** |

---

## 4. Architecture Pattern

**Modular Monolith.** Not microservices.

Organise the codebase into clear domain modules. Each module owns its routes,
services, and types. Do not split into separate deployable services.

```
src/
├── modules/
│   ├── school/          # Onboarding, settings, session management
│   ├── academic/        # Divisions, class levels, class arms, students
│   ├── parents/         # Parent accounts, multi-ward relationships
│   ├── fees/            # Fee item library, class fee templates
│   ├── activities/      # Optional fee enrolment (StudentActivityEnrolment)
│   ├── invoices/        # Invoice generation, line items, carryover logic
│   ├── discounts/       # Discount rules, conditional logic, applications
│   ├── payments/        # Payment recording, verification queue, receipts
│   ├── notifications/   # Email (Resend), SMS (Termii), in-app
│   └── audit/           # Immutable AuditLog
├── lib/                 # Shared utilities (prisma client, auth, storage)
└── types/               # Global TypeScript types and Zod schemas
```

---

## 5. Domain Model — Critical Entities

Understand these before writing any code. Every entity is scoped to `school_id`.

### Academic Hierarchy
```
School
 └── Division          (Nursery | Primary | Secondary)
      └── ClassLevel   (e.g. JSS1, Primary 4, Nursery 2)
           └── ClassArm (e.g. JSS1A, JSS1B)
                └── Student
```

### Financial Hierarchy
```
FeeItem (library)                   ← reusable, school-level catalogue
 └── ClassFeeTemplate               ← assigns mandatory items to a class/term
      └── Invoice                   ← one per student per term
           └── InvoiceLineItem      ← one row per fee component or discount

StudentActivityEnrolment            ← links optional FeeItems to students (session-scoped)
DiscountRule                        ← reusable discount definitions
Payment                             ← one per instalment; multiple per invoice
AuditLog                            ← immutable log of every financial action
```

### Parent-Ward Linking
Each parent can be linked to multiple students (wards). A parent-ward link requires:

| Field | Description |
|-------|-------------|
| Parent | Reference to parent account |
| Student | Reference to student record |
| Relationship type | Mother, Father, Guardian, Sponsor, Other |
| Primary contact | Boolean — exactly one parent per student should be primary |
| Receives invoice notifications | Boolean — controls who gets fee reminders |

If a student has no linked parent, show a visible warning in the UI:
> No parent linked — this student can receive invoices, but no parent will be available for payment communication until one is linked.

### Key Schema Rules
- All monetary values: `Decimal(12,2)` — **never use JavaScript floats for money**
- Every entity has `school_id` — multi-tenant isolation is non-negotiable
- `AuditLog` table: **never allow UPDATE or DELETE on this table**
- Locked terms (`status = 'locked'`): **no writes to invoices or payments**
- `Invoice.balance_due = final_amount - amount_paid` — always recalculate on payment

### Invoice Status Flow
```
draft → issued → partial → paid
                 ↓
              overdue  (nightly job: due_date passed, balance_due > 0)
```

### Fee Types
- `mandatory` — applies to all students in a class via ClassFeeTemplate
- `optional` — assigned per student via StudentActivityEnrolment (e.g. STEM Club)

### Billing Frequency
- `per_term` — appears on every term's invoice
- `per_session` — appears once (first term of session only)
- `one_off` — appears once ever per student (e.g. ID card, uniform)

### Discount Types
- `fixed` — flat naira amount off
- `percentage` — % of invoice total or specific fee item
- `conditional` — auto-applies when condition is met: `sibling_count` or `early_payment`

### Carryover Logic
When generating Term N invoices, check each student's Term N-1 invoice.
If `balance_due > 0`, add a `InvoiceLineItem` with `line_type = 'carryover'`
labelled "Previous Term Balance" to the new invoice.

---

## 6. Coding Standards

### TypeScript
- Strict mode: always
- No `any` types — use `unknown` and narrow properly
- Define Zod schemas first; derive TypeScript types from them (`z.infer<typeof Schema>`)
- Co-locate schemas with their domain module

### Prisma
- Always use transactions (`prisma.$transaction`) for any operation that touches
  more than one table (e.g. approve payment → update invoice balance → write audit log)
- Never do raw arithmetic on Decimal in JS — use Prisma's `Decimal` type methods
- Always include `school_id` in every query's `where` clause

### API Routes
- Validate all inputs with Zod before touching the database
- Return consistent error shapes: `{ error: string, code: string }`
- Protect every route with auth middleware — check `session.user.schoolId`
- Never return more data than the client needs — use Prisma `select`

### Financial Calculations
```typescript
// CORRECT — use Decimal arithmetic
import { Decimal } from '@prisma/client/runtime/library';
const balance = invoice.finalAmount.minus(invoice.amountPaid);

// WRONG — never do this
const balance = invoice.finalAmount - invoice.amountPaid; // float arithmetic loses precision
```

### Audit Logging
Every mutation that touches Invoice, Payment, DiscountApplication, or FeeTemplate
**must** write an AuditLog entry in the same Prisma transaction:
```typescript
await prisma.$transaction([
  prisma.payment.update({ ... }),
  prisma.invoice.update({ ... }),  // recalculate balance_due
  prisma.auditLog.create({
    data: {
      schoolId, actorId, actorName, action, entityType, entityId,
      previousValue, newValue, ipAddress, createdAt: new Date()
    }
  })
]);
```

### File Uploads (Receipt Proofs)
- Generate presigned PUT URLs server-side; client uploads directly to R2
- Store only the R2 object key in the database — never the full URL
- Generate presigned GET URLs on demand with short TTL (15 min) when serving receipts
- Accepted types: `image/jpeg`, `image/png`, `application/pdf` — validate server-side

---

## 7. UX Architecture — Two Distinct Experiences

WardBalance is a **single responsive web application** with two intentionally different
design experiences built into it. There is no native mobile app in Phase 1 or Phase 2.

```
WardBalance Web App
├── Admin Platform      → Desktop-first  (min-width: 1280px  design base: 1440px)
└── Parent Portal       → Mobile-first   (min-width: 360px   design base: 390px)
```

This is not a trade-off. It is a deliberate product decision based on how each user
actually works. Do not collapse these two experiences into a single responsive layout.

---

### 7.1  Why This Split Exists

| User | Primary Device | Primary Tasks |
|------|---------------|---------------|
| School Owner | Laptop / Desktop | Revenue dashboard, reports, financial oversight |
| Bursar | Desktop | Invoice generation, payment verification, reconciliation |
| Accountant | Desktop | Debtor reports, financial exports, balance review |
| Administrator | Desktop | Student records, parent management, fee setup |
| Parent | Mobile (phone) | View balance, upload proof, download receipt |

Admin tasks are **power workflows** — bulk invoice generation, verification queues,
data tables with filters, multi-column dashboards. These are painful and wrong on mobile.

Parent tasks are **simple, linear, and infrequent** — check balance, upload screenshot,
get receipt. These are natural on mobile and broken on desktop-only layouts.

---

### 7.2  Admin Platform — Desktop-First Rules

**Design base:** 1440px wide. Minimum supported width: 1280px.

The admin platform may degrade gracefully below 1280px but is **not required to be
fully functional on mobile**. Do not sacrifice desktop UX to accommodate mobile admins.

**Layout pattern — always use sidebar navigation:**
```
┌─────────────────────────────────────────────────────┐
│  Top bar: School name | Session/Term | User menu     │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │   Main content area                      │
│ nav      │   (data tables, forms, dashboards)        │
│ 240px    │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Admin UI patterns to use:**
- Full data tables with sortable columns, filters, and pagination
- Bulk action checkboxes (select all, select class, then action)
- Split-pane layouts for verify-while-viewing (proof image | invoice details)
- Multi-step wizards for complex flows (invoice generation, fee template setup)
- Sticky table headers and fixed sidebar — content scrolls, chrome does not
- Keyboard shortcuts for power users (bursar verifying 100 transfers in a row)

**Admin navigation structure:**
```
Dashboard
Students
Parents
Fee Structure
  ├── Fee Library
  ├── Class Templates
  └── Activities
Invoices
Payments
  ├── Record Payment
  └── Verification Queue
Reports
  ├── Revenue Summary
  ├── Debtor List
  └── Payment History
Settings
  ├── School Profile
  ├── Academic Sessions
  ├── Divisions & Classes
  └── User Management
```

**Admin key flow performance targets:**
- See total outstanding for the school: visible on dashboard, zero clicks
- Approve a pending bank transfer: ≤ 2 clicks
- Record a cash payment: ≤ 3 clicks
- Generate term invoices for a class: ≤ 4 steps
- Export debtor list: ≤ 2 clicks

---

### 7.3  Parent Portal — Mobile-First Rules

**Design base:** 390px wide (iPhone 14 / common Android). Minimum supported: 360px.

The parent portal must be **fully functional and polished on mobile**. It should work
perfectly in mobile Safari (iOS) and Chrome (Android) without installing anything.

**Layout pattern — always use bottom tab navigation on mobile:**
```
┌─────────────────────┐
│  Top bar: logo | 🔔 │
│                     │
│   Main content      │
│   (cards, lists)    │
│                     │
│                     │
├─────────────────────┤
│ Wards│Invoices│More │  ← bottom tabs, thumb-reachable
└─────────────────────┘
```

**Parent UI patterns to use:**
- Card-based layout — one card per child showing name, class, balance status
- Traffic-light status badges: 🟢 Paid | 🟡 Partial | 🔴 Overdue
- Large tap targets (min 44px height) — parents are on phones, not using a mouse
- Simple, linear payment proof upload: one screen, one action
- Full-screen invoice breakdown — large text, clear line items, no horizontal scroll
- Native share sheet integration for receipt download on iOS and Android
- Pull-to-refresh for balance updates

**Parent portal navigation structure:**
```
My Wards      (home — all children, combined balance)
Invoices      (list of all invoices across all children)
Payments      (payment history + upload proof)
Receipts      (downloadable receipts for approved payments)
Profile       (contact details, notification preferences)
```

**Parent portal performance targets:**
- See combined outstanding balance: visible on first screen after login, zero taps
- View full invoice breakdown for a child: ≤ 2 taps
- Upload payment proof: ≤ 3 taps from home screen
- Download a receipt: ≤ 2 taps

---

### 7.4  Shared UX Principles (Both Surfaces)

1. **WhatsApp-level easy** — if a Nigerian bursar can use WhatsApp, they can use this
2. **Transparent** — every naira is itemised; no opaque totals ever on either surface
3. **Fast over fancy** — do not add animation, modals, or steps that do not earn their place
4. **Offline-tolerant** — show stale data with a visible refresh indicator; never blank screens
5. **Naira formatting** — always `₦120,000` with thousands separator; never `N120000`
6. **Login** — Admins: password-based via email invitation (set password on first login, then email+password). Parents: OTP via email or phone number; no passwords.

---

### 7.5  Responsive Breakpoints (Tailwind)

Use these Tailwind breakpoints consistently across the entire codebase:

```typescript
// tailwind.config.ts
screens: {
  'sm':  '360px',   // Parent portal minimum
  'md':  '768px',   // Tablet — admin nav collapses to icon-only
  'lg':  '1024px',  // Laptop — admin sidebar appears
  'xl':  '1280px',  // Admin platform minimum supported
  '2xl': '1440px',  // Admin platform design base
}
```

**Rule:** Admin components are built at `xl` / `2xl` first, then degraded.
Parent portal components are built at `sm` first, then enhanced.
Never build a component assuming it serves both surfaces without explicitly
handling both breakpoints.

---

### 7.6  Phase 2B — Progressive Web App (PWA)

In Phase 2B, add PWA support to the **Parent Portal only**:
- `manifest.json` with app name, icons, theme colour
- Service worker for offline balance caching
- "Add to Home Screen" prompt after second visit
- Push notifications for payment confirmations and fee reminders

This gives parents an app-like experience without App Store approval, build cost,
or platform maintenance overhead.

**Do not add PWA to the Admin Platform** — admins work in browsers on desktops
and do not need home screen installation.

---

### 7.7  Phase 3 — Native Mobile App (Conditional)

A React Native parent app will only be built in Phase 3 **if all of these are true:**
- Parent portal monthly active usage exceeds 70%
- Schools actively request a native app
- PWA push notifications prove insufficient for engagement

Do not build native iOS or Android apps before this evidence exists.

---

## 8. Phase 1 — MVP Scope (Historical)

Phase 1 is complete. It delivered:
- Marketing landing page (hero, features, pricing, FAQ, social proof)
- Lead capture form with email notification
- Lead database (single `Lead` table)
- Cookie consent, SEO metadata, analytics foundation

---

## 9. Phase 2A — Admin Platform Foundation

This is the immediate build. Do not build Phase 2B features until Phase 2A is stable.

### 9.1 In Scope

**Auth & Onboarding**
- [ ] Auth-aware admin shell (NextAuth.js with email invitation + password)
- [ ] School tenant creation (from approved lead)
- [ ] First admin user setup (invite → set password → confirm school name)
- [ ] Setup checklist wizard (12 required steps, dependency-aware)
- [ ] School profile form

**Academic Structure**
- [ ] Academic session and term management (including term locking)
- [ ] Division, class level, and class arm setup

**Student & Parent Management**
- [ ] Student list and add student form
- [ ] Parent list and add parent form
- [ ] Parent-to-ward linking (relationship type, primary contact, notification recipient)
- [ ] Student and parent profile shells
- [ ] Visible warning for students without linked parents

**Fee Setup**
- [ ] Fee item library (mandatory + optional, billing frequency)
- [ ] Class fee templates per term

**Invoice Generation**
- [ ] Bulk invoice generation wizard with batch preview
- [ ] Duplicate invoice prevention
- [ ] Invoice list and invoice detail with fee breakdown
- [ ] Fee carryover from previous term (line item)
- [ ] Discount application (fixed, percentage) on invoice

**Manual Payments**
- [ ] Manual payment recording (cash, bank transfer, POS, cheque)
- [ ] Payment list
- [ ] Payment detail drawer
- [ ] Invoice balance recalculation on payment recording
- [ ] Audit log for every payment action

**Receipts**
- [ ] Basic receipt record generation on payment approval
- [ ] Receipt data stored (no PDF generation automation required yet)

**Dashboard**
- [ ] Total invoices generated
- [ ] Expected revenue
- [ ] Collected revenue
- [ ] Outstanding balance
- [ ] Students without linked parents
- [ ] Pending setup steps reminder
- [ ] Setup-first empty state (if checklist incomplete)

**Reports**
- [ ] Revenue summary
- [ ] Outstanding balance report
- [ ] Debtors list (with class/division filters)
- [ ] Class collection summary

**Infrastructure**
- [ ] Audit log (read-only, all financial actions)
- [ ] Permission-aware UI (role-based action visibility)
- [ ] Backend permission enforcement on all restricted actions

### 9.2 Out of Scope for Phase 2A

- Parent portal (deferred to Phase 2B)
- Flutterwave payment link generation and webhook processing
- Bank transfer verification queue (approve/reject flow)
- PDF receipt automation (record only — generate PDF in Phase 2B)
- Automated SMS reminders (Termii)
- Automated email reminders
- Discount rule engine (conditional/sibling discounts)
- Student Activity Enrolment (optional fees per student)
- Overdue invoice detection nightly job
- Advanced reports (discount reports, trend comparison, forecasting)
- CSV/PDF exports
- Bulk reconciliation engine
- Parent statement PDF

### 9.3 Phase 2A Dashboard KPIs

Only these KPIs should appear on the Phase 2A dashboard:

- Total invoices generated
- Expected revenue (sum of all invoice `final_amount`)
- Collected revenue (sum of all approved payment amounts)
- Outstanding balance (expected − collected)
- Students without linked parents (count, drillable)
- Pending setup steps (shown until checklist is complete)

If the setup checklist is incomplete, show the setup-first dashboard:
> Your finance dashboard is almost ready. Complete your school setup to start generating invoices and tracking payments.

CTA: `Continue Setup`

### 9.4 Phase 2A Reports Scope

Build these only:

- Revenue summary (total expected, collected, outstanding by session/term)
- Outstanding balance report (per student, drillable to invoice)
- Debtors list (filterable by class arm, division, term)
- Class collection summary (per class arm, aggregated)

Defer:
- Discount report, payment method report, trend comparison, forecasting, parent statement PDF

### 9.5 Payment Strategy for Phase 2A

Manual-payment-first. No Flutterwave production settlement in Phase 2A.

**Allowed manual payment methods:** Cash, Bank transfer, POS, Cheque

**Payment statuses:** `Recorded`, `Void`

> If there is no approval workflow yet, use Recorded/Void and log the actor who recorded the payment.

Every manual payment must be tied to:
- School (`school_id`)
- Invoice (`invoice_id`)
- Student (`student_id`)
- Parent (`parent_id`)
- Amount
- Payment method
- Actor who recorded it

Never allow unscoped payments.

---

## 10. Phase 2A Sprint Plan (Historical — All Complete)

> Phase 2A is complete. The sprint plan below documents what was built. Use it as
> context for understanding existing features, not as an active task list.

### Sprint 1: Platform Shell and Onboarding

Build:
- Auth-aware admin shell (sidebar + header layout)
- School setup checklist page
- School profile form
- Academic session and term management
- Basic school settings page

Acceptance criteria:
- New school owner lands on setup checklist after first login
- Setup progress is visible and persists across sessions
- School profile can be saved and retrieved
- Academic session and term can be created and listed

### Sprint 2: Academic Structure, Students, and Parents

Build:
- Division, class level, class arm CRUD
- Student list with filters and pagination
- Add student form
- Parent list with filters and pagination
- Add parent form
- Parent-to-ward linking UI (within student profile)
- Student and parent profile pages (shells)

Acceptance criteria:
- Students can be assigned to class arms
- Parents can be created and searched
- One parent can be linked to multiple wards
- Students without linked parents are clearly flagged in UI

### Sprint 3: Fees and Invoice Generation

Build:
- Fee item CRUD (library)
- Class fee template create/edit/publish
- Invoice generation wizard (select session → term → class → template → preview)
- Invoice batch preview (shows expected revenue per student and total)
- Duplicate invoice detection and prevention
- Invoice list and invoice detail page
- Basic discount application (fixed and percentage)

Acceptance criteria:
- Published fee templates can generate invoices for selected students
- Duplicate invoices are blocked with clear error message
- Invoice preview shows individual line items and total
- Invoice detail page displays fee breakdown, balance, and status

### Sprint 4: Manual Payments and Receipts

Build:
- Manual payment recording form
- Payment list with filters
- Payment detail drawer/modal
- Invoice balance recalculation hook on payment record
- Basic receipt record creation on payment
- Audit log entries for all payment actions

Acceptance criteria:
- Bursar can record a manual payment tied to an invoice
- Invoice balance updates correctly after payment
- Receipt record is created automatically
- Payment creation is logged in audit log with before/after values

### Sprint 5: Dashboard, Reports, and Audit Logs

Build:
- Dashboard page with 6 KPIs
- Setup-first empty state when checklist is incomplete
- Revenue summary report
- Outstanding balance report
- Debtors list with class/division filters
- Class collection summary
- Audit log table (read-only, filterable by entity type/action/actor)

Acceptance criteria:
- Dashboard reflects real invoice and payment data
- Reports can be filtered by session, term, and class
- Debtors list shows students with outstanding balance
- Audit log is visible, read-only, and filterable

---

## 11. Lead-to-School Conversion Flow

### User Story

As the WardBalance internal team, I want to convert an approved early access lead into
a school tenant so that the school can begin onboarding into the admin platform.

### Flow

```
Lead submits early access form (Phase 1)
↓
Lead is stored in database
↓
WardBalance team reviews lead (manual)
↓
Lead is approved for pilot
↓
School tenant is created from lead data
↓
First admin user invite is sent
↓
School owner completes setup checklist (Phase 2A)
```

### Minimum Fields for School Creation

| Field | Required | Source |
|-------|----------|--------|
| School name | Yes | Lead form |
| School owner name | Yes | Lead form |
| School owner email | Yes | Lead form |
| Phone number | Yes | Lead form |
| Estimated number of students | Yes | Lead form |
| School address | No | Lead form |
| Pilot status | Auto | Internal decision |
| Setup status | Auto | Default: `invited` |

### School Statuses

```
lead → approved → invited → onboarding → active → paused | archived
```

Do not automatically create a full active school account just because a lead
submitted the marketing form.

### First Login Flow

```
User receives invite email with link
↓
User opens invite link (validated + time-limited token)
↓
User sets password
↓
User confirms school name (prefilled from lead)
↓
User lands on setup checklist
```

**First login screen content:**
- WardBalance logo
- School name
- Welcome message: "Welcome to WardBalance. You have been invited to set up your school's financial workspace. Create your password to continue."
- Password setup form (with confirmation)
- Terms/Privacy acknowledgement checkbox
- Continue button

**Important rule:** Do not land a new school owner directly on an empty dashboard.
Always send them to the setup checklist first.

---

## 12. Setup Checklist

The setup checklist is the center of the first admin experience. It should appear
after first login and be accessible at any time from the sidebar until completed.

### Required Setup Steps (In Order)

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

Each step has one of these states:

```
Not started
In progress
Completed
Skipped
Needs attention
```

### Checklist Item Requirements

Each checklist item must show:

- Step title
- Short description (1-2 sentences)
- Status badge with state
- CTA button (contextual: Start / Continue / View / Edit)
- Dependency note if blocked (e.g. "Blocked until: Academic term is created")

Example:

```
Create class fee templates

Define what each class should pay this term.

Status: Not started
Blocked until:
  - Academic term is created
  - Class levels/class arms are created
  - Fee items are created

[Create Fee Template]
```

### Dashboard Empty State

If setup is incomplete, the dashboard shows:

> Your finance dashboard is almost ready. Complete your school setup to start generating invoices and tracking payments.

CTA: `Continue Setup`

---

## 13. Data Import

Manual data entry is important, but schools may want to import existing records.
Phase 2A should include at least the UX foundation for CSV/XLSX imports.

### Importable Records (Phase 2A)

| Record | Phase 2A Priority |
|--------|-------------------|
| Students | Build import flow |
| Parents | Build import flow |
| Parent-to-ward links | Defer to Phase 2B |
| Fee items | Defer to Phase 2B |

### Student Import Flow

```
1. Upload CSV/XLSX file
2. Map source columns to system fields
3. Preview parsed records (first 20 rows)
4. Show validation errors per row
5. Confirm import (or fix and retry)
6. Show import summary
```

### Required Student Columns

| Column | Validation |
|--------|-----------|
| First name | Required, non-empty |
| Last name | Required, non-empty |
| Admission number | Required, unique per school |
| Class level | Must exist in system |
| Class arm | Must exist under class level |
| Status | Must be valid: `active`, `graduated`, `transferred`, `suspended` |

### Optional Student Columns

Gender, Date of birth, Parent name, Parent phone, Parent email

### Import Error Examples

```
Admission number is missing.
Class arm "JSS1C" does not exist.
Duplicate admission number "ADM-0234" found.
Parent phone number is invalid (must be Nigerian mobile).
```

### Import Summary Example

```
Import completed

120 students imported
  8 records skipped
  5 records need review
```

**Important UX rule:** Do not import invalid rows silently. Always show what failed and why.

---

## 14. Permission Matrix

### Roles

| Role | Description |
|------|-------------|
| School Owner | Full access. Can manage settings, invite users, override financial actions. |
| Principal | View-only on most financial modules. Dashboard and reports access. |
| Bursar | Full financial operations. Can create fees, generate invoices, record payments. |
| Admin | Academic and people operations. Can manage students, parents, classes. |

### Role × Action Matrix

| Module / Action | School Owner | Principal | Bursar | Admin |
|-----------------|:-----------:|:---------:|:-----:|:-----:|
| View dashboard | Yes | Yes | Yes | Limited |
| Manage school settings | Yes | No | No | Limited |
| Invite users | Yes | No | No | No |
| Manage academic setup (divisions, classes, sessions) | Yes | View | No | Yes |
| Add/edit students | Yes | View | No | Yes |
| Add/edit parents | Yes | View | No | Yes |
| Link parents to wards | Yes | View | No | Yes |
| Create fee items | Yes | View | Yes | No |
| Create fee templates | Yes | View | Yes | No |
| Publish fee templates | Yes | View | Yes | No |
| Generate invoices | Yes | View | Yes | No |
| Void invoices | Yes | No | Limited | No |
| Record manual payments | Yes | No | Yes | No |
| Void payments | Yes | No | Limited | No |
| View reports | Yes | Yes | Yes | Limited |
| Export reports | Yes | Yes | Yes | No |
| View audit logs | Yes | Yes | Yes | No |

### Enforcement Rules

1. The frontend may hide unavailable actions based on role, but **backend permissions must enforce every restricted action**
2. "Limited" means the user can view data but cannot create, edit, or delete
3. "View" means read-only access to that module's data
4. Default role for first user is School Owner

---

## 15. Nigerian Market Context

Understand this context before making UX or architecture decisions:

- Most school fees are paid via **bank transfer** — parents send money via USSD or
  mobile banking app, then upload a screenshot as proof
- Parents commonly pay in **instalments** — partial payment is the norm, not the exception
- Many schools run **Nursery + Primary + Secondary** as separate divisions under one
  proprietor — the fee structure for each division is completely different
- **Sibling discounts** are extremely common — the 2nd and 3rd child of the same parent
  typically pays less
- Bursars are not highly technical — any flow requiring more than 30 minutes of training
  will fail adoption
- Nigerian schools love **printed receipts** — the PDF receipt feature is a major
  trust-building differentiator over WhatsApp screenshots
- Naira is the currency throughout — use `₦` symbol; format as `₦120,000` not `N120000`

---

## 16. Environment Variables

These are the expected `.env` keys. Do not hardcode any values.

```bash
# Database
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email (Resend)
RESEND_API_KEY=

# SMS (Termii) — Phase 2B required
TERMII_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

All secrets live in `.env.local`. Never hardcode them. Never log them. `R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY` and `R2_SECRET_ACCESS_KEY` must never appear in client-side code.

---

## 17. Testing Expectations

- Unit test all financial calculation logic (invoice totals, discount application,
  carryover, balance recalculation) — these must be 100% covered
- Integration test the payment verification flow end-to-end (record → balance update → audit log)
- Use Vitest for unit tests, Playwright for E2E
- Mock Prisma in unit tests using `prisma-mock` or a test database
- Never mock financial arithmetic — test with real Decimal values

---

## 18. Commit Conventions

Use Conventional Commits:

```
feat(invoices): add bulk invoice generation for class arm
fix(payments): correct decimal precision in balance recalculation
feat(discounts): implement sibling discount conditional logic
chore(db): add migration for StudentActivityEnrolment table
test(invoices): add carryover calculation unit tests
```

Module scopes: `school`, `academic`, `parents`, `fees`, `activities`,
`invoices`, `discounts`, `payments`, `notifications`, `audit`, `auth`, `ui`

---

## 19. Definition of Done (Phase 2A)

A Phase 2A feature is done when:

1. TypeScript compiles with zero errors (`tsc --noEmit`)
2. All Zod schemas validate correctly for both happy and error paths
3. Prisma migrations are written and applied
4. Every financial mutation writes an AuditLog entry in the same transaction
5. Admin features render correctly at 1280px–1440px
6. Permission-aware UI matches the matrix (§14)
7. Backend enforces permissions (not just frontend hiding)
8. When applicable, a user with role "School Owner" can perform the action
9. Unit tests pass for any calculation logic
10. Relevant Playwright E2E test covers the primary user flow (when test framework is set up)

---

## 20. Related Files

| File | Purpose |
|------|---------|
| `.agents/rules/governance.md` | **Engineering Constitution** — master audit, review, and implementation governance framework (read first) |
| `.agents/rules/architecture.md` | Module boundaries, data flow, API conventions |
| `.agents/rules/code-style.md` | TypeScript, Prisma, Zod, transaction patterns |
| `.agents/rules/design-system.md` | Tailwind tokens, component patterns, both surfaces |
| `.agents/rules/security.md` | Multi-tenancy, auth, file access, audit requirements |
| `.agents/rules/payments.md` | Payment status transitions, reconciliation, phase rules |
| `.agents/rules/permissions.md` | Complete role × action permission matrix |
| `.agents/rules/testing.md` | Vitest, Playwright, mock patterns, test database |
| `skills/flutterwave-integration/` | All Flutterwave payment patterns for this product |
| `skills/invoice-engine/` | Invoice generation, carryover, line item logic |
| `skills/audit-log-writer/` | Correct audit log pattern for every financial mutation |
| `skills/tenant-guard/` | school_id enforcement on every query and route |
| `skills/component-builder/` | Admin and Portal component templates with TanStack Query |
| `skills/api-route-scaffolder/` | API route scaffold with auth, tenant, Zod, audit |
| `skills/db-migration-runner/` | Prisma migration workflow, schema conventions, enums |
| `skills/report-builder/` | Revenue summaries, debtor lists, CSV/PDF exports |
| `skills/lifecycle-engine/` | Lifecycle Automation & Customer Engagement Engine specification |
| `workflows/new-component.md` | Step-by-step for building any UI component |
| `workflows/new-api-route.md` | Step-by-step for building any API route |
| `workflows/new-payment-flow.md` | Step-by-step for building any payment feature |
| `workflows/new-prisma-model.md` | Step-by-step for adding a new database table |
| `workflows/new-module.md` | Step-by-step for creating a new domain module |
| `workflows/new-dashboard-widget.md` | Step-by-step for adding a dashboard stat card |

---

## 21. Agent Development Workflow

When given a task, follow these steps in order:

1. **Read the relevant rule files** in `.agents/rules/` — governance, architecture, code-style, design-system, security, permissions, payments, testing
2. **Apply the Engineering Constitution** (`.agents/rules/governance.md`) — this governs all audit, review, and implementation decisions
3. **Load the matching skill** from `skills/` for domain-specific implementation patterns
4. **Follow the matching workflow** from `workflows/` for step-by-step process
5. **Check phase awareness** — never build Phase 2B+ features unless explicitly instructed
6. **Prepare a Change Impact Assessment** (§5 of governance) before writing any code
7. **Declare Non-Goals** (§6 of governance) to prevent scope creep
8. **Run `tsc --noEmit`** after implementation to verify zero type errors
9. **Check Definition of Done** (§19) and **Production Readiness Gates** (§19 of governance) before marking complete

---

*Last updated: July 2026 — WardBalance Phase 2B Complete*
