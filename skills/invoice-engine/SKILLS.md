# Skill: Invoice Engine

## Purpose
Generate, update, and manage invoices correctly. Invoices are the core financial
record of WardBalance. Every monetary action flows through them.

---

## Invoice Generation — Full Flow

### Inputs required before generating
- Active session with `termId` (the term to generate invoices for)
- `ClassFeeTemplate` for each target class (must exist and be complete)
- `StudentActivityEnrolment` records for optional fees (fetched automatically)
- Previous term's invoice records (for carryover calculation)

### Step 1 — Fetch class fee template
```typescript
const template = await prisma.classFeeTemplate.findFirst({
  where: { classLevelId, termId, schoolId },
  include: { items: { include: { feeItem: true } } },
})
if (!template) throw new Error(`No fee template for class ${classLevelId} in term ${termId}`)
```

### Step 2 — Fetch student's optional enrolments
```typescript
const enrolments = await prisma.studentActivityEnrolment.findMany({
  where: { studentId, sessionId, status: 'active' },
  include: { feeItem: true },
})
```

### Step 3 — Calculate carryover
```typescript
const previousInvoice = await prisma.invoice.findFirst({
  where: { studentId, schoolId, term: { termNumber: currentTermNumber - 1, sessionId } },
  select: { balanceDue: true, status: true },
})
const carryover = previousInvoice?.balanceDue.gt(0) ? previousInvoice.balanceDue : new Decimal(0)
```

### Step 4 — Build line items
```typescript
const lineItems: LineItemInput[] = []

// Mandatory fee items from template
for (const item of template.items) {
  // Skip per_session items if not first term
  if (item.feeItem.billingFrequency === 'per_session' && !isFirstTermOfSession) continue
  // Skip one_off items if student already has them on a previous invoice
  if (item.feeItem.billingFrequency === 'one_off' && (await hasExistingOneOffCharge(studentId, item.feeItemId))) continue

  lineItems.push({ feeItemId: item.feeItemId, label: item.feeItem.name,
                   amount: item.amount, lineType: 'fee', isMandatory: true })
}

// Optional enrolments
for (const enrolment of enrolments) {
  lineItems.push({ feeItemId: enrolment.feeItemId, label: enrolment.feeItem.name,
                   amount: enrolment.feeItem.defaultAmount, lineType: 'fee', isMandatory: false })
}

// Carryover
if (carryover.gt(0)) {
  lineItems.push({ feeItemId: null, label: 'Previous Term Balance',
                   amount: carryover, lineType: 'carryover', isMandatory: true })
}
```

### Step 5 — Apply conditional discounts
```typescript
const discountRules = await prisma.discountRule.findMany({
  where: { schoolId, isActive: true, conditionType: { not: null } },
})

for (const rule of discountRules) {
  if (rule.conditionType === 'sibling_count') {
    const siblingCount = await getSiblingPosition(studentId, schoolId)
    if (siblingCount >= Number(rule.conditionValue)) {
      const discountAmount = calculateDiscount(rule, grossAmount)
      lineItems.push({ feeItemId: null, label: rule.name,
                       amount: discountAmount.negated(), lineType: 'discount', isMandatory: false })
    }
  }
}
```

### Step 6 — Calculate totals
```typescript
const grossAmount = lineItems.filter(i => i.lineType === 'fee' || i.lineType === 'carryover')
                             .reduce((sum, i) => sum.plus(i.amount), new Decimal(0))
const discountAmount = lineItems.filter(i => i.lineType === 'discount')
                                .reduce((sum, i) => sum.plus(i.amount.abs()), new Decimal(0))
const finalAmount = grossAmount.minus(discountAmount)
```

### Step 7 — Persist invoice + line items in one transaction
```typescript
await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.create({
    data: { schoolId, studentId, termId, sessionId, dueDate, status: 'draft',
            grossAmount, discountAmount, carryoverAmount: carryover,
            finalAmount, amountPaid: new Decimal(0), balanceDue: finalAmount },
  })

  await tx.invoiceLineItem.createMany({
    data: lineItems.map(item => ({ ...item, invoiceId: invoice.id })),
  })

  await writeAuditLog(tx, {
    schoolId, actorId, actorName, action: 'create',
    entityType: 'Invoice', entityId: invoice.id,
    previousValue: null, newValue: invoice,
  })

  return invoice
})
```

---

## Balance Recalculation

Run this after every approved payment. Always inside the same transaction.

```typescript
async function recalculateInvoiceBalance(tx: PrismaTransaction, invoiceId: string, schoolId: string) {
  const payments = await tx.payment.findMany({
    where: { invoiceId, schoolId, verificationStatus: 'approved' },
    select: { amountPaid: true },
  })

  const totalPaid = payments.reduce((sum, p) => sum.plus(p.amountPaid), new Decimal(0))

  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId, schoolId } })
  const balanceDue = invoice!.finalAmount.minus(totalPaid)

  const status = balanceDue.lte(0) ? 'paid'
    : totalPaid.gt(0) ? 'partial'
    : 'issued'

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid: totalPaid, balanceDue, status },
  })
}
```

---

## Overdue Detection — Nightly Job

```typescript
// BullMQ worker: overdue-check
export async function checkOverdueInvoices() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.invoice.updateMany({
    where: {
      status: { in: ['issued', 'partial'] },
      dueDate: { lt: today },
      balanceDue: { gt: 0 },
    },
    data: { status: 'overdue' },
  })
}
```

After marking overdue, dispatch email notifications to affected parents.

---

## Discount Calculation Helper

```typescript
function calculateDiscount(rule: DiscountRule, grossAmount: Decimal): Decimal {
  if (rule.discountType === 'fixed') return new Decimal(rule.value)
  if (rule.discountType === 'percentage') return grossAmount.times(rule.value).dividedBy(100)
  return new Decimal(0)
}
```

---

## Invoice Generation Checklist

- [ ] Template exists for every target class
- [ ] `per_session` items excluded from terms 2 and 3
- [ ] `one_off` items checked against previous invoices
- [ ] Optional enrolments fetched and included
- [ ] Carryover calculated from previous term
- [ ] Conditional discounts evaluated
- [ ] Totals computed using Decimal arithmetic only
- [ ] Invoice + line items created in a single transaction
- [ ] AuditLog written in the same transaction
- [ ] Duplicate invoice check before bulk generation
