# Skill: Audit Log Writer

## Purpose
Write correct, consistent, immutable audit log entries for every financial mutation
in WardBalance. The audit log is a legal-grade record of all financial actions.

---

## The Rule

Every function that mutates Invoice, Payment, DiscountApplication, FeeTemplate,
or Term must write an AuditLog entry **in the same Prisma transaction**.

If there is no transaction, create one. An audit log entry written outside a
transaction is not acceptable — it can succeed while the mutation fails, or vice versa.

---

## The writeAuditLog Helper

This function is the only way to write audit log entries. Always import and use it.
Never write to `prisma.auditLog` directly from business code.

```typescript
// modules/audit/audit.service.ts
import { Prisma } from '@prisma/client'

type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject' |
                   'issue' | 'lock' | 'unlock' | 'apply_discount' | 'generate'

interface AuditLogInput {
  schoolId: string
  actorId: string
  actorName: string          // snapshot — do not rely on FK lookup
  action: AuditAction
  entityType: string         // 'Invoice' | 'Payment' | 'DiscountRule' | 'Term' | etc.
  entityId: string
  previousValue: object | null
  newValue: object | null
  ipAddress?: string
}

export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  input: AuditLogInput
): Promise<void> {
  await tx.auditLog.create({
    data: {
      schoolId:      input.schoolId,
      actorId:       input.actorId,
      actorName:     input.actorName,
      action:        input.action,
      entityType:    input.entityType,
      entityId:      input.entityId,
      previousValue: input.previousValue ? JSON.parse(JSON.stringify(input.previousValue)) : null,
      newValue:      input.newValue      ? JSON.parse(JSON.stringify(input.newValue))      : null,
      ipAddress:     input.ipAddress ?? null,
      createdAt:     new Date(),
    },
  })
}
```

---

## Usage Pattern — Every Financial Mutation

```typescript
// Approving a payment
const updated = await prisma.$transaction(async (tx) => {
  const previous = await tx.payment.findUnique({ where: { id: paymentId } })

  const payment = await tx.payment.update({
    where: { id: paymentId },
    data: { verificationStatus: 'approved', verifiedBy: actorId, verifiedAt: new Date() },
  })

  // Recalculate invoice balance in the same transaction
  await recalculateInvoiceBalance(tx, payment.invoiceId, schoolId)

  // Write audit log — same transaction
  await writeAuditLog(tx, {
    schoolId,
    actorId: session.user.id,
    actorName: session.user.name,
    action: 'approve',
    entityType: 'Payment',
    entityId: payment.id,
    previousValue: previous,
    newValue: payment,
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  })

  return payment
})
```

---

## Required Coverage — Which Actions to Log

| Entity | Actions that must be logged |
|--------|-----------------------------|
| Invoice | `create` `update` `issue` `generate` |
| Payment | `create` `approve` `reject` |
| DiscountApplication | `apply_discount` `delete` |
| FeeTemplate | `create` `update` `delete` |
| DiscountRule | `create` `update` `delete` |
| Term | `lock` `unlock` `update` |
| FeeItem | `create` `update` `delete` |
| StudentActivityEnrolment | `create` `update` |

---

## Snapshot Principle

`previousValue` must be the full record **before** the mutation.
`newValue` must be the full record **after** the mutation.

Fetch the previous state inside the transaction before making changes:
```typescript
const previous = await tx.invoice.findUnique({ where: { id: invoiceId } })
// ... make change ...
const updated = await tx.invoice.update({ ... })

await writeAuditLog(tx, {
  previousValue: previous,  // full record snapshot
  newValue: updated,        // full record snapshot
  ...
})
```

Do not log partial objects or only the changed fields. Log the entire record.
This allows the audit log to reconstruct any historical state.

---

## What Must Never Happen

- `auditLog.update()` — never
- `auditLog.delete()` — never
- `auditLog.deleteMany()` — never
- Writing to `auditLog` outside a `prisma.$transaction`
- Using raw SQL to bypass Prisma on the audit log table
- Omitting the audit log because "it's just a minor change"
