# Skill: Flutterwave Integration

## Purpose
Handle all payment collection, verification, and reconciliation for WardBalance
using the Flutterwave API. This is the only payment provider for this product.
Do not suggest or use Paystack, Monnify, or any other gateway.

## Phase Awareness
- Phase 1: Flutterwave Standard Checkout (payment links) for online payments + Manual bank transfer upload with admin verification. Flutterwave payment links are the primary online payment method for MVP.
- Phase 2: Virtual Accounts for auto-reconciliation. Monnify becomes the primary provider for virtual accounts, with Flutterwave retained for Standard Checkout.

Do not implement Phase 2 (Virtual Accounts, Monnify) features unless explicitly instructed.

---

## Required Environment Variables

```bash
FLW_PUBLIC_KEY=        # Exposed to client for inline checkout
FLW_SECRET_KEY=        # Server-side only — never in client code
FLW_ENCRYPTION_KEY=    # Server-side only — for payment encryption
FLW_WEBHOOK_SECRET=    # Verify incoming webhook signatures
```

---

## Payment Flow — Standard Checkout

Used when a parent pays directly via card, bank transfer, or USSD through the
Flutterwave checkout modal.

### Step 1 — Initialise payment (server)
```typescript
// POST /api/payments/flutterwave/initiate
const response = await fetch('https://api.flutterwave.com/v3/payments', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tx_ref: `WB-${invoiceId}-${Date.now()}`,   // unique per transaction
    amount: amountInNaira,                      // Decimal converted to number
    currency: 'NGN',
    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/payment/callback`,
    customer: {
      email: parent.email,
      phonenumber: parent.phone,
      name: parent.fullName,
    },
    meta: {
      invoiceId,
      schoolId,
      parentId,
    },
    customizations: {
      title: 'WardBalance — School Fee Payment',
      logo: school.logoUrl,
    },
  }),
})
```

### Step 2 — Render checkout (client)
Load the Flutterwave inline script. Do not use the redirect method unless the
inline modal is explicitly unsupported.

```typescript
// Use flutterwave-react-v3 package
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3'

const config = {
  public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY,
  tx_ref: txRef,        // from server initiation response
  amount: amount,
  currency: 'NGN',
  payment_options: 'card,ussd,banktransfer',
  customer: { email, phone_number, name },
  customizations: { title, logo },
}
```

### Step 3 — Verify transaction (server — webhook + callback)
Never trust the client-side success callback amount. Always re-verify server-side.

```typescript
// GET https://api.flutterwave.com/v3/transactions/{transaction_id}/verify
const verify = await fetch(
  `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
  { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
)
const { data } = await verify.json()

if (
  data.status === 'successful' &&
  data.currency === 'NGN' &&
  new Decimal(data.amount).equals(expectedAmount) &&
  data.meta.invoiceId === invoiceId &&
  data.meta.schoolId === schoolId
) {
  // Safe to record as approved payment
}
```

---

## Virtual Accounts — Auto-Reconciliation (Phase 2)

Each parent gets a dedicated virtual bank account number. Any transfer to that
account auto-triggers a webhook and reconciles to their invoice automatically.

### Create virtual account
```typescript
// POST https://api.flutterwave.com/v3/virtual-account-numbers
{
  email: parent.email,
  is_permanent: true,
  bvn: null,           // not required for school fee collection
  tx_ref: `VA-${parentId}-${schoolId}`,
  amount: null,        // permanent account accepts any amount
  narration: `${school.name} — ${parent.fullName}`,
}
```

Store `account_number` and `bank_name` on the `Parent` record.
Display it to the parent as their dedicated payment account.

---

## Webhook Handler

```typescript
// POST /api/webhooks/flutterwave
export async function POST(req: Request) {
  // 1. Verify signature
  const hash = req.headers.get('verif-hash')
  if (hash !== process.env.FLW_WEBHOOK_SECRET) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = await req.json()

  // 2. Only handle successful charges
  if (payload.event !== 'charge.completed') return Response.json({ received: true })
  if (payload.data.status !== 'successful') return Response.json({ received: true })

  // 3. Idempotency — check if already processed
  const existing = await prisma.payment.findFirst({
    where: { transactionReference: payload.data.tx_ref }
  })
  if (existing) return Response.json({ received: true })

  // 4. Re-verify via API
  const verified = await verifyFlutterwaveTransaction(payload.data.id)
  if (!verified) return Response.json({ error: 'Verification failed' }, { status: 400 })

  // 5. Record payment + update invoice + write audit log (one transaction)
  await recordVerifiedPayment(verified)

  return Response.json({ received: true })
}
```

---

## Transaction Reference Format

All Flutterwave `tx_ref` values must follow this format:
```
WB-{invoiceId}-{timestamp}         Standard checkout
VA-{parentId}-{schoolId}           Virtual account creation
```

This allows tracing any transaction back to its invoice and school without
querying the database from the webhook handler.

---

## Error Handling

| Flutterwave status | Action |
|-------------------|--------|
| `successful` | Verify amount + meta, then record payment |
| `pending` | Store as pending, re-check via scheduled job |
| `failed` | Log to Sentry, notify parent via email |
| `cancelled` | No action required |

Never mark a payment as approved based on a client-side callback alone.
Always verify via the Flutterwave server-side API.
