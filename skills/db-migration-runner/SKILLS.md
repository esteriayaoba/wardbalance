# Skill: DB Migration Runner

## Purpose
Create, review, and apply Prisma migrations for WardBalance schema changes safely,
with attention to financial data integrity and zero-downtime requirements.

---

## Migration Workflow

### 1. Create a migration (development)
```bash
npx prisma migrate dev --name describe_the_change
```

Always name migrations descriptively:
```
add_student_activity_enrolment
add_carryover_to_invoices
add_flutterwave_virtual_account_to_parents
add_audit_log_table
add_term_status_enum
```

### 2. Review the generated SQL before applying
Always read the generated SQL in `prisma/migrations/[timestamp]_[name]/migration.sql`
before applying to staging or production. Look for:
- Unintended `DROP` statements
- Missing `NOT NULL` defaults on existing columns
- Missing indexes on foreign keys and frequently-queried fields

### 3. Apply to production
```bash
npx prisma migrate deploy
```

Never use `prisma migrate dev` in production — it may prompt interactively.

---

## Schema Conventions

### Naming Convention — @@map

Use `@@map("snake_case_name")` on every model to ensure PostgreSQL table names follow
convention. Prisma's default `camelCase` model names produce mixed-case table names
in PostgreSQL, which require quoting.

```prisma
model Invoice {
  // ...

  @@map("invoices")
}
```

### Hard Requirements for Every School-Scoped Model

Every model that has a `schoolId` field **must** have:
- `@@index([schoolId])` — tenant isolation queries must be fast
- `schoolId` in every unique query's `where` clause (enforced at application layer, not DB)
- A relation to the `School` model with `references: [id]`

### All financial models
```prisma
model Invoice {
  id              String   @id @default(uuid())
  schoolId        String
  grossAmount     Decimal  @db.Decimal(12, 2)
  discountAmount  Decimal  @db.Decimal(12, 2)
  carryoverAmount Decimal  @db.Decimal(12, 2)
  finalAmount     Decimal  @db.Decimal(12, 2)
  amountPaid      Decimal  @db.Decimal(12, 2)
  balanceDue      Decimal  @db.Decimal(12, 2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  school   School   @relation(fields: [schoolId], references: [id])

  @@index([schoolId])                             // REQUIRED — every school-scoped model
  @@index([schoolId, status])                     // composite for dashboard queries
  @@index([schoolId, termId])
  @@map("invoices")
}
```

### Enum definitions
Define all enums in Prisma schema — never as plain strings.
```prisma
enum InvoiceStatus {
  draft
  issued
  partial
  paid
  overdue
}

enum FeeType {
  mandatory
  optional
}

enum BillingFrequency {
  per_term
  per_session
  one_off
}

enum PaymentMethod {
  bank_transfer
  cash
  pos
  cheque
  online_gateway
}

enum VerificationStatus {
  pending
  approved
  rejected
}

enum TermStatus {
  draft
  active
  locked
}

enum DiscountType {
  fixed
  percentage
  conditional
}

enum ConditionType {
  sibling_count
  early_payment
}

enum LineItemType {
  fee
  carryover
  discount
}

enum UserRole {
  owner
  bursar
  accountant
  admin
  parent
}
```

### InvoiceLineItem — uses LineItemType enum

```prisma
model InvoiceLineItem {
  id          String       @id @default(uuid())
  invoiceId   String
  feeItemId   String?
  label       String
  amount      Decimal      @db.Decimal(12, 2)
  lineType    LineItemType
  isMandatory Boolean

  invoice Invoice @relation(fields: [invoiceId], references: [id])

  @@index([invoiceId])
  @@map("invoice_line_items")
}
```

### AuditLog — no cascade delete, ever
```prisma
model AuditLog {
  id            String   @id @default(uuid())
  schoolId      String
  actorId       String
  actorName     String                          // snapshot — not FK
  action        String
  entityType    String
  entityId      String
  previousValue Json?
  newValue      Json?
  ipAddress     String?
  createdAt     DateTime @default(now())

  // No @updatedAt — audit logs are immutable
  // No relation to School with cascade delete — protect audit history

  @@index([schoolId])
  @@index([schoolId, entityType, entityId])
  @@index([schoolId, createdAt])
}
```

### Payment — with idempotencyKey

Every payment record must have a unique `transactionReference` to prevent duplicate
processing. For manual payments (cash, POS, cheque), generate an `idempotencyKey`
on the client and validate server-side to prevent double-submission.

```prisma
model Payment {
  id                       String            @id @default(uuid())
  schoolId                 String
  invoiceId                String
  parentId                 String
  studentId                String
  amountPaid               Decimal           @db.Decimal(12, 2)
  paymentMethod            PaymentMethod
  transactionReference     String?           @unique
  idempotencyKey           String?           @unique   // prevents double-submission
  flutterwaveTransactionId String?
  proofUrl                 String?                      // R2 object key
  receiptUrl               String?                      // R2 object key
  verificationStatus       VerificationStatus @default(pending)
  rejectionReason          String?
  verifiedById             String?
  verifiedAt               DateTime?
  paymentDate              DateTime
  createdAt                DateTime          @default(now())
  updatedAt                DateTime          @updatedAt

  school  School   @relation(fields: [schoolId], references: [id])
  invoice Invoice  @relation(fields: [invoiceId], references: [id])

  @@index([schoolId])
  @@index([schoolId, verificationStatus])                // verification queue query
  @@index([invoiceId])
  @@unique([transactionReference, schoolId])             // scoped unique
  @@map("payments")
}
```

### Outbox — reliable side-effect dispatch

Use the outbox pattern to dispatch receipt generation and email notifications
reliably. Write to the outbox inside the same transaction as the financial mutation,
then process asynchronously via a scheduled worker or queue consumer.

```prisma
model Outbox {
  id        String   @id @default(uuid())
  schoolId  String
  eventType String                        // 'payment.approved' | 'invoice.issued' | etc.
  payload   Json                          // serialisable event data
  status    OutboxStatus @default(pending)
  retryCount Int      @default(0)
  lastError String?
  createdAt DateTime @default(now())
  processedAt DateTime?

  @@index([status, createdAt])
  @@index([schoolId])
  @@map("outbox")
}

enum OutboxStatus {
  pending
  processing
  sent
  failed
}
```

---

## Indexes — Required on Every Model

Always add these indexes:
- `schoolId` on every tenant-scoped model
- Composite `(schoolId, [frequently filtered field])` for dashboard queries
- Foreign key fields (Prisma does not auto-index FKs in PostgreSQL)

---

## Additive Migrations Only

For existing tables with data, always use additive changes:
- Adding columns: always provide a default value or make nullable first
- Renaming: add new column, backfill, deprecate old column (never direct rename with data)
- Removing: deprecate with `@deprecated` comment first — remove in a separate migration

```prisma
// Adding a nullable column first — safe with existing data
flutterwaveVirtualAccountNumber String?
flutterwaveVirtualBankName      String?
```

---

## Seed Data

Development seed file lives at `prisma/seed.ts`.
Provides: one demo school, all divisions, sample classes, 10 students, 2 parents,
one fee structure, one term of invoices, one pending payment.

```bash
npx prisma db seed
```

Never seed to production. Use `NODE_ENV` check in seed file.
