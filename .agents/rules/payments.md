# Payment Rules

## Phase Awareness

| Phase | Payment Methods | Verification |
|-------|----------------|--------------|
| Phase 1 — MVP | Flutterwave Standard Checkout (payment links) + Manual bank transfer (cash, POS, cheque) | Admin approves/rejects bank transfer proofs; Flutterwave webhooks auto-verify online payments |
| Phase 2 — Scale | Monnify virtual accounts (primary) + Flutterwave (secondary) | Virtual accounts auto-reconcile via webhook |

**Do not build Phase 2 payment features unless explicitly instructed.**

---

## Payment Status Flow

```
pending (parent uploads proof)
  │
  ├── approved (admin verifies) → invoice balance updated → receipt generated
  │
  ├── rejected (admin rejects)  → parent notified, can re-upload
  │
  └── awaiting_reupload (admin requests clearer proof)
```

For Flutterwave online payments, the flow is:
```
parent completes checkout → webhook received → server re-verifies via Flutterwave API
  → approved (auto) → invoice balance updated → receipt generated
```

---

## Every Payment Must Be Scoped

Every `Payment` record must have these four foreign keys populated:

| Field | Source | Purpose |
|-------|--------|---------|
| `school_id` | Session (from auth) | Tenant isolation |
| `invoice_id` | Request body or webhook meta | Links to the invoice being paid |
| `parent_id` | Session (parent) or webhook meta | Who paid |
| `student_id` | Derived from the invoice | Which student this payment is for |

Never create an unscoped payment. If any of these four values is missing, reject the request.

---

## Payment Amount Rules

- A single payment can be **less than** the invoice balance due (instalments are normal).
- A single payment cannot exceed the invoice balance due — reject overpayments.
- When a payment is approved, recalculate `invoice.amount_paid` and `invoice.balance_due` in the same transaction.
- `invoice.balance_due = invoice.final_amount - invoice.amount_paid` (all Decimal).

---

## Manual Payment Recording (Admin)

Supported methods: `bank_transfer`, `cash`, `pos`, `cheque`.

Admin records the payment directly (no parent upload needed). The payment is created with `verification_status: 'approved'` immediately since an admin is the verifier.

```typescript
await prisma.$transaction(async (tx) => {
  const payment = await tx.payment.create({
    data: {
      schoolId, invoiceId, parentId, studentId,
      amountPaid: new Decimal(amount),
      paymentMethod,
      transactionReference: ref || null,
      verificationStatus: 'approved',
      verifiedById: session.user.id,
      verifiedAt: new Date(),
      paymentDate: new Date(),
    },
  })
  await recalculateInvoiceBalance(tx, invoiceId, schoolId)
  await writeAuditLog(tx, { action: 'create', entityType: 'Payment', ... })
})
```

---

## Flutterwave Online Payment (Phase 1)

See `skills/flutterwave-integration/SKILLS.md` for full implementation.

Key rules:
- Always re-verify via Flutterwave Verify Transaction API — never trust the webhook payload alone
- Check `amount`, `currency` (`NGN`), `meta.invoiceId`, and `meta.schoolId` match
- Webhook handler must verify `verif-hash` header before processing
- Idempotency: check for existing `transactionReference` before creating a payment

---

## Duplicate Prevention

- `transactionReference` has a unique constraint scoped to `schoolId`.
- `idempotencyKey` on the Payment model prevents double-submission from client-side retries.
- The webhook handler checks for duplicate `tx_ref` before processing.

---

## Receipt Generation

After payment approval (whether manual or auto):
1. Receipt PDF is generated using `@react-pdf/renderer` or Puppeteer
2. Uploaded to R2 with object key: `{schoolId}/receipts/{paymentId}/receipt.pdf`
3. `receiptUrl` on the Payment record is updated with the R2 object key
4. Parent is notified via email with a presigned download URL (15-minute TTL)

Use the outbox pattern for steps 1-4 to ensure reliability.

---

## Audit Requirements

Every payment mutation must write an `AuditLog` entry in the same Prisma transaction:
- `create` — when a payment record is first created
- `approve` — when a pending payment is approved
- `reject` — when a pending payment is rejected

---

## Verification Queue (Admin)

The verification queue displays all payments with `verificationStatus: 'pending'`.
Display in a split-pane layout (see `design-system.md`).

Actions:
- **Approve**: updates payment → recalculates invoice → writes audit log → queues receipt
- **Reject**: updates payment with reason → writes audit log → notifies parent
- **Request re-upload**: sets status to `awaiting_reupload` → notifies parent
