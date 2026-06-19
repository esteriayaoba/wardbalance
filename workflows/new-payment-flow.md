# Workflow: New Payment Flow

Follow these steps when building any feature that records, verifies, or processes a payment.

---

## Phase Awareness

- **Phase 1** — Flutterwave Standard Checkout (payment links) for online payments + Manual bank transfer upload with admin verification. These are the two core payment flows for MVP. Read `skills/flutterwave-integration/SKILLS.md` before implementing any Flutterwave flow.
- **Phase 2** — Virtual Accounts (Monnify) for auto-reconciliation. Not in scope for MVP.

Before starting, confirm which phase this feature belongs to.
Do not build Phase 2 features unless explicitly instructed.

---

## Phase 1 — Manual Bank Transfer Verification Flow

This is the core payment flow for the MVP. It has two sides: parent and admin.

### Parent side — uploading proof

**Route:** `POST /api/portal/payments/proof`

Steps:
1. Parent selects the invoice they are paying against
2. Parent enters the amount being paid (partial amounts are valid)
3. Parent enters the transaction reference from their bank app
4. Parent uploads screenshot or PDF (presigned R2 URL — see step below)
5. Submission creates a `Payment` record with `verificationStatus: 'pending'`
6. Parent sees "Pending Verification" status immediately

**Presigned upload URL:**
```typescript
// POST /api/upload/presign
// Returns: { uploadUrl, objectKey }
// Client uploads directly to R2 using the uploadUrl
// Then sends objectKey in the payment proof submission
```

**Payment record created:**
```typescript
await prisma.$transaction(async (tx) => {
  const payment = await tx.payment.create({
    data: {
      invoiceId, schoolId, parentId,
      amountPaid: new Decimal(amount),
      paymentMethod: 'bank_transfer',
      transactionReference,
      proofUrl: objectKey,          // R2 object key — not full URL
      verificationStatus: 'pending',
      paymentDate: new Date(),
    },
  })
  await writeAuditLog(tx, {
    action: 'create', entityType: 'Payment', entityId: payment.id,
    previousValue: null, newValue: payment, ...ctx,
  })
  return payment
})
```

---

### Admin side — verification queue

**Route:** `PATCH /api/payments/[id]/verify`

The verification queue shows all payments with `verificationStatus: 'pending'`.
Display in a split-pane layout: proof image on the left, invoice detail on the right.

**Approve flow:**
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Update payment status
  const updated = await tx.payment.update({
    where: { id: paymentId, schoolId },
    data: { verificationStatus: 'approved', verifiedById: actorId, verifiedAt: new Date() },
  })

  // 2. Recalculate invoice balance
  await recalculateInvoiceBalance(tx, updated.invoiceId, schoolId)

  // 3. Audit log
  await writeAuditLog(tx, { action: 'approve', entityType: 'Payment', ... })

  // 4. Write to outbox table — receipts and notifications are processed
  //    asynchronously from the outbox, ensuring at-least-once delivery
  //    even if the queue or email service is temporarily unavailable.
  await tx.outbox.create({
    data: {
      schoolId,
      eventType: 'payment.approved',
      payload: { paymentId: updated.id, invoiceId: updated.invoiceId },
      status: 'pending',
    },
  })
})

// 5. Process outbox (or rely on a scheduled worker).
//    The worker picks up pending outbox rows, generates the receipt PDF,
//    uploads to R2, saves the receiptUrl on the Payment record,
//    sends the email notification, then marks the outbox row as sent.
```

**Reject flow:**
```typescript
await prisma.$transaction(async (tx) => {
  const updated = await tx.payment.update({
    where: { id: paymentId, schoolId },
    data: { verificationStatus: 'rejected', rejectionReason, verifiedById: actorId, verifiedAt: new Date() },
  })
  await writeAuditLog(tx, { action: 'reject', entityType: 'Payment', ... })
})
await notifyParent('payment_rejected', { reason: rejectionReason, ... })
```

---

## Phase 2 — Virtual Accounts & Auto-Reconciliation (Future)

Read `skills/flutterwave-integration/SKILLS.md` for reference when Phase 2 begins.

High-level steps (future scope — do not implement yet):

1. Create dedicated virtual bank accounts per parent via Monnify
2. Parents transfer directly to their dedicated account number
3. Incoming transfers trigger webhooks for auto-reconciliation
4. Reconciliation matches transfer to the parent's pending invoice balance
5. Payment recorded as approved without admin intervention

---

## Receipt Generation (after any approval)

```typescript
// BullMQ worker: receipt-generate
export async function generateReceipt(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: { include: { lineItems: true, student: { include: { classArm: true, parent: true } } } },
    },
  })

  // Generate PDF using @react-pdf/renderer or Puppeteer
  const pdfBuffer = await renderReceiptPdf(payment)

  // Upload to R2
  const objectKey = `${payment.schoolId}/receipts/${paymentId}/receipt.pdf`
  await uploadToR2(objectKey, pdfBuffer)

  // Save object key to payment record
  await prisma.payment.update({
    where: { id: paymentId },
    data: { receiptUrl: objectKey },
  })

  // Notify parent
  await notifyParent('receipt_ready', { payment, receiptDownloadUrl: getPresignedUrl(objectKey) })
}
```

---

## Payment Flow — Complete Checklist

- [ ] `Payment` record created inside a `prisma.$transaction`
- [ ] `AuditLog` written inside the same transaction
- [ ] Proof stored as R2 object key — never full URL
- [ ] On approval: invoice balance recalculated in the same transaction
- [ ] Invoice status updated correctly (partial / paid)
- [ ] Receipt generation queued as background job after transaction commits
- [ ] Parent email notification sent after transaction commits
- [ ] For Flutterwave (Phase 2): server-side verification before any approval
- [ ] Webhook handler verifies signature before processing
- [ ] Webhook handler is idempotent — checks for duplicate `tx_ref`
