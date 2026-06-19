# Architecture Rules

## Pattern: Modular Monolith

WardBalance is a modular monolith. Each domain is a self-contained module.
Do not split into microservices. Do not create cross-module direct imports.

Every module owns:
- Its Prisma queries (via a service file)
- Its Zod schemas
- Its API route handlers
- Its TypeScript types

Cross-module communication happens through the service layer only — never by importing
another module's internal files directly.

---

## Module List

| Module | Owns |
|--------|------|
| `school` | School profile, onboarding, session/term management |
| `academic` | Divisions, ClassLevels, ClassArms |
| `students` | Student records, class assignment |
| `parents` | Parent accounts, ward linking |
| `fees` | FeeItem library, ClassFeeTemplates |
| `activities` | StudentActivityEnrolment |
| `invoices` | Invoice generation, line items, carryover, status |
| `discounts` | DiscountRule definitions and application |
| `payments` | Payment recording, verification queue, receipts |
| `notifications` | Email (Resend), SMS (Termii), in-app |
| `audit` | AuditLog — write-only from other modules, read via admin UI |
| `reports` | Revenue summaries, debtor lists, exports |
| `auth` | Session, OTP, role checks |

---

## API Route Conventions

All API routes live under `/app/api/[module]/`.

Every route must:
1. Authenticate the session first — reject with `401` if missing
2. Extract and validate `schoolId` from the session — reject with `403` if missing
3. Validate request body with Zod — reject with `400` + error detail if invalid
4. Scope every Prisma query with `where: { schoolId }` — no exceptions
5. Return `{ data }` on success or `{ error, code }` on failure

```
GET    /api/invoices              list invoices for school
POST   /api/invoices              create / bulk generate
GET    /api/invoices/[id]         single invoice
PATCH  /api/invoices/[id]         update status or fields
POST   /api/payments              record a payment
PATCH  /api/payments/[id]/verify  approve or reject a verification
```

---

## Data Flow

```
Client (React) → TanStack Query → API Route → Zod validation
  → Auth middleware → Prisma (school-scoped) → PostgreSQL
  → AuditLog (same transaction) → Response
```

Background jobs (BullMQ):
```
Scheduler → Queue → Worker → Prisma → AuditLog → Notification
```

File uploads:
```
Client → POST /api/upload/presign (get signed PUT URL)
       → PUT directly to R2 (no app server involved)
       → PATCH /api/payments/[id] (save R2 object key)
```

---

## Financial Calculation Rules

- All monetary fields: `Decimal(12,2)` in Prisma schema
- All arithmetic: use Prisma `Decimal` methods — `.plus()` `.minus()` `.times()`
- `Invoice.balance_due` is always derived: `final_amount - amount_paid`
- Recalculate `balance_due` and `amount_paid` after every approved payment
- Never cache computed financial totals — always derive from source records

---

## Transaction Boundaries

Any operation touching more than one financial table must use `prisma.$transaction`.
The AuditLog write must be included in the same transaction as the financial mutation.

If the transaction fails, the audit log entry must also be rolled back.
If the audit log write fails, the financial mutation must also be rolled back.

---

## Background Jobs

Registered BullMQ workers:

| Queue | Trigger | Action |
|-------|---------|--------|
| `overdue-check` | Nightly 00:00 WAT | Mark invoices overdue, notify parents |
| `reminder-dispatch` | Scheduled by admin | Send fee reminders to selected parents |
| `receipt-generate` | On payment approval | Generate PDF, store to R2, notify parent |
| `bulk-invoice` | Admin action | Generate invoices in background for large classes |

Jobs must be idempotent — safe to retry without creating duplicates.
Use a `jobKey` or check for existing records before writing.
