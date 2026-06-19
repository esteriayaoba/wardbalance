# Skill: Report Builder

## Purpose
Generate financial reports, summaries, debtor lists, and data exports for WardBalance
admin users. All reports are school-scoped and computed from live Prisma queries.

---

## Available Reports

| Report | Who sees it | Format |
|--------|------------|--------|
| Revenue Summary | Owner, Bursar, Accountant | Dashboard card + full page |
| Debtor List | Owner, Bursar, Accountant | Table + CSV export |
| Payment History | Owner, Bursar, Accountant | Table + CSV export |
| Student Statement | Owner, Bursar | PDF per student |
| Parent Statement | Owner, Bursar | PDF per parent (all wards) |
| Term Statement | Owner, Bursar | PDF for full term |

---

## Revenue Summary Query

```typescript
// modules/reports/revenue-summary.service.ts
export async function getRevenueSummary(schoolId: string, termId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { schoolId, termId, status: { not: 'draft' } },
    select: { finalAmount: true, amountPaid: true, balanceDue: true, status: true },
  })

  const summary = invoices.reduce(
    (acc, inv) => ({
      expected:    acc.expected.plus(inv.finalAmount),
      collected:   acc.collected.plus(inv.amountPaid),
      outstanding: acc.outstanding.plus(inv.balanceDue),
      paidCount:   acc.paidCount + (inv.status === 'paid' ? 1 : 0),
      partialCount: acc.partialCount + (inv.status === 'partial' ? 1 : 0),
      overdueCount: acc.overdueCount + (inv.status === 'overdue' ? 1 : 0),
      totalCount:   acc.totalCount + 1,
    }),
    {
      expected: new Decimal(0), collected: new Decimal(0), outstanding: new Decimal(0),
      paidCount: 0, partialCount: 0, overdueCount: 0, totalCount: 0,
    }
  )

  return {
    ...summary,
    collectionRate: summary.expected.gt(0)
      ? summary.collected.dividedBy(summary.expected).times(100).toFixed(1)
      : '0.0',
  }
}
```

---

## Debtor List Query

```typescript
export async function getDebtorList(schoolId: string, termId: string, filters?: {
  divisionId?: string
  classLevelId?: string
  minBalance?: number
}) {
  return prisma.invoice.findMany({
    where: {
      schoolId,
      termId,
      status: { in: ['issued', 'partial', 'overdue'] },
      balanceDue: { gt: filters?.minBalance ? new Decimal(filters.minBalance) : 0 },
      student: {
        classArm: {
          classLevel: {
            ...(filters?.classLevelId ? { id: filters.classLevelId } : {}),
            ...(filters?.divisionId   ? { divisionId: filters.divisionId } : {}),
          },
        },
      },
    },
    select: {
      id: true,
      status: true,
      finalAmount: true,
      amountPaid: true,
      balanceDue: true,
      dueDate: true,
      student: {
        select: {
          fullName: true,
          admissionNumber: true,
          classArm: { select: { name: true, classLevel: { select: { name: true } } } },
          parent: { select: { fullName: true, phone: true, email: true } },
        },
      },
    },
    orderBy: { balanceDue: 'desc' },
  })
}
```

---

## CSV Export

```typescript
import { createObjectCsvWriter } from 'csv-writer'
import path from 'path'
import os from 'os'

export async function exportDebtorListCsv(debtors: DebtorRecord[]): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `debtors-${Date.now()}.csv`)

  const writer = createObjectCsvWriter({
    path: tmpPath,
    header: [
      { id: 'studentName',    title: 'Student Name' },
      { id: 'admissionNo',    title: 'Admission No.' },
      { id: 'class',          title: 'Class' },
      { id: 'parentName',     title: 'Parent/Guardian' },
      { id: 'parentPhone',    title: 'Phone' },
      { id: 'totalFee',       title: 'Total Fee (₦)' },
      { id: 'amountPaid',     title: 'Amount Paid (₦)' },
      { id: 'balanceDue',     title: 'Balance Due (₦)' },
      { id: 'status',         title: 'Status' },
      { id: 'dueDate',        title: 'Due Date' },
    ],
  })

  await writer.writeRecords(debtors.map(d => ({
    studentName:  d.student.fullName,
    admissionNo:  d.student.admissionNumber,
    class:        `${d.student.classArm.classLevel.name} ${d.student.classArm.name}`,
    parentName:   d.student.parent.fullName,
    parentPhone:  d.student.parent.phone,
    totalFee:     d.finalAmount.toFixed(2),
    amountPaid:   d.amountPaid.toFixed(2),
    balanceDue:   d.balanceDue.toFixed(2),
    status:       d.status,
    dueDate:      d.dueDate.toISOString().split('T')[0],
  })))

  return tmpPath
}
```

---

## PDF Statement — Student

Use `@react-pdf/renderer` for client-rendered PDFs or Puppeteer for server-rendered.

PDF must include:
- School name, logo, address
- Student name, class, admission number
- Academic session and term
- All invoice line items with labels and amounts
- Discount line items in green
- Carryover in amber
- Total fee, amount paid, balance due
- Payment history (date, method, amount, reference, status)
- Generation date and "Printed from WardBalance"

---

## Dashboard Report Cards — Admin

The dashboard shows four stat cards at the top. These are the priority numbers:

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Expected Revenue │ │ Collected        │ │ Outstanding      │ │ Collection Rate  │
│ ₦4,500,000      │ │ ₦3,120,000      │ │ ₦1,380,000      │ │ 69.3%           │
│ This term        │ │ This term        │ │ This term        │ │ This term        │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

A fifth card shows `Pending Verifications` count — linked to the verification queue.
A sixth card shows `Overdue Invoices` count — linked to the debtor list.
