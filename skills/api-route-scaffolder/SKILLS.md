# Skill: API Route Scaffolder

## Purpose
Generate correctly structured Next.js API route handlers for WardBalance that
enforce authentication, tenant isolation, Zod validation, and consistent error responses.

---

## Route File Location

```
app/api/[module]/route.ts            collection (list, create)
app/api/[module]/[id]/route.ts       single record (get, update, delete)
app/api/[module]/[id]/[action]/route.ts  sub-actions (e.g. verify, lock, issue)
```

---

## Full Route Template

```typescript
// app/api/invoices/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/modules/audit/audit.service'

// ─── Schemas ───────────────────────────────────────────────────────────────

const CreateInvoiceSchema = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
  dueDate: z.coerce.date(),
})

// ─── GET /api/invoices ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return err('Unauthorised', 'AUTH_REQUIRED', 401)

  const schoolId = session.user.schoolId
  if (!schoolId) return err('Forbidden', 'NO_SCHOOL', 403)

  const { searchParams } = new URL(req.url)
  const termId = searchParams.get('termId')

  const invoices = await prisma.invoice.findMany({
    where: {
      schoolId,
      ...(termId ? { termId } : {}),
    },
    select: {
      id: true,
      status: true,
      finalAmount: true,
      balanceDue: true,
      dueDate: true,
      student: { select: { fullName: true, classArm: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({ data: invoices })
}

// ─── POST /api/invoices ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return err('Unauthorised', 'AUTH_REQUIRED', 401)

  const schoolId = session.user.schoolId
  if (!schoolId) return err('Forbidden', 'NO_SCHOOL', 403)

  // Role check
  if (!['owner', 'bursar'].includes(session.user.role)) {
    return err('Forbidden', 'INSUFFICIENT_ROLE', 403)
  }

  const body = await req.json()
  const result = CreateInvoiceSchema.safeParse(body)
  if (!result.success) return err(result.error.flatten(), 'VALIDATION_ERROR', 400)

  const { studentId, termId, dueDate } = result.data

  // Verify student belongs to this school
  const student = await prisma.student.findUnique({
    where: { id: studentId, schoolId },
  })
  if (!student) return err('Student not found', 'NOT_FOUND', 404)

  // Check term is not locked
  const term = await prisma.term.findUnique({ where: { id: termId, schoolId } })
  if (!term) return err('Term not found', 'NOT_FOUND', 404)
  if (term.status === 'locked') return err('Term is locked', 'TERM_LOCKED', 422)

  // Create invoice + audit log in one transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: { schoolId, studentId, termId, dueDate, status: 'draft',
              grossAmount: 0, discountAmount: 0, carryoverAmount: 0,
              finalAmount: 0, amountPaid: 0, balanceDue: 0 },
    })
    await writeAuditLog(tx, {
      schoolId,
      actorId: session.user.id,
      actorName: session.user.name,
      action: 'create',
      entityType: 'Invoice',
      entityId: created.id,
      previousValue: null,
      newValue: created,
    })
    return created
  })

  return Response.json({ data: invoice }, { status: 201 })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function err(error: unknown, code: string, status: number) {
  return Response.json({ error, code }, { status })
}
```

---

## Sub-Action Route Template

```typescript
// app/api/payments/[id]/verify/route.ts
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return err('Unauthorised', 'AUTH_REQUIRED', 401)

  const schoolId = session.user.schoolId
  if (!schoolId) return err('Forbidden', 'NO_SCHOOL', 403)

  if (!['owner', 'bursar'].includes(session.user.role)) {
    return err('Insufficient role', 'INSUFFICIENT_ROLE', 403)
  }

  const paymentId = z.string().uuid().safeParse(params.id)
  if (!paymentId.success) return err('Invalid ID', 'VALIDATION_ERROR', 400)

  const body = await req.json()
  const result = VerifyPaymentSchema.safeParse(body)
  if (!result.success) return err(result.error.flatten(), 'VALIDATION_ERROR', 400)

  // Fetch payment — scoped to school
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId.data, schoolId },
    include: { invoice: true },
  })
  if (!payment) return err('Payment not found', 'NOT_FOUND', 404)

  // Execute verification in transaction
  const updated = await prisma.$transaction(async (tx) => {
    // ... business logic
    // ... write audit log
  })

  return Response.json({ data: updated })
}
```

---

## Scaffolding Checklist

When generating a new route, verify:

- [ ] Auth check first — returns `401` if no session
- [ ] `schoolId` from session — never from request body or URL params
- [ ] Role check where action is restricted
- [ ] Zod validation on all input — returns `400` with flattened errors
- [ ] UUID params validated with `z.string().uuid()`
- [ ] All Prisma queries include `schoolId` in `where`
- [ ] Term lock check for any financial write
- [ ] `prisma.$transaction` used for multi-table writes
- [ ] AuditLog written inside the transaction
- [ ] `select` used to return minimum required fields
- [ ] Correct HTTP status codes (200 list, 201 create, 200 update, 404 not found, 422 business rule)
