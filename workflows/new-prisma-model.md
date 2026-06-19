# Workflow: New Prisma Model

Follow these steps every time you add a new table to the database.

---

## Step 1 — Design the model fields

Before writing Prisma schema, answer:
- Does this model belong to a school? → Must have `schoolId String` + `@@index([schoolId])`
- Does it store money? → Use `Decimal @db.Decimal(12, 2)` for every monetary field
- Does it need a status? → Define it as a Prisma `enum`, not a plain string
- Will it be queried by multiple fields? → Add composite indexes
- Is it a financial record? → It will need AuditLog coverage

---

## Step 2 — Write the model in `schema.prisma`

```prisma
model StudentActivityEnrolment {
  id               String        @id @default(uuid())
  schoolId         String
  studentId        String
  feeItemId        String
  sessionId        String
  enrolledById     String
  enrolmentSource  EnrolmentSource
  status           EnrolmentStatus @default(active)
  deactivatedAt    DateTime?
  notes            String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  school   School  @relation(fields: [schoolId],   references: [id])
  student  Student @relation(fields: [studentId],  references: [id])
  feeItem  FeeItem @relation(fields: [feeItemId],  references: [id])
  session  AcademicSession @relation(fields: [sessionId], references: [id])

  @@unique([studentId, feeItemId, sessionId])   // no duplicate enrolments
  @@index([schoolId])
  @@index([schoolId, sessionId])
  @@index([studentId, sessionId])
}

enum EnrolmentSource {
  admin
  parent_self
  parent_confirmed
}

enum EnrolmentStatus {
  active
  inactive
}
```

---

## Step 3 — Run the migration

```bash
npx prisma migrate dev --name add_student_activity_enrolment
```

Review the generated SQL before applying. Check for:
- Any unintended `DROP` statements
- Missing defaults on new `NOT NULL` columns
- Generated indexes matching what you specified

---

## Step 4 — Regenerate the Prisma client

```bash
npx prisma generate
```

TypeScript types are now available. Confirm no type errors with `tsc --noEmit`.

---

## Step 5 — Update the seed file

Add representative seed data for the new model in `prisma/seed.ts`.
The seed must work from a clean database without errors.

---

## Step 6 — Checklist

- [ ] `schoolId` field present (if school-scoped)
- [ ] `@@index([schoolId])` present
- [ ] All monetary fields use `Decimal @db.Decimal(12, 2)`
- [ ] Status fields use Prisma `enum` not `String`
- [ ] Unique constraints defined where appropriate
- [ ] Composite indexes for common query patterns
- [ ] Migration runs cleanly on a fresh database
- [ ] `prisma generate` succeeds
- [ ] `tsc --noEmit` passes after generate
- [ ] Seed data added
