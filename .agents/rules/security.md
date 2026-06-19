# Security Rules

## Multi-Tenancy — The Most Critical Rule

Every database query that reads or writes school data must include `school_id` in
the `where` clause. This is enforced at the application layer, not just the database.

A school must never be able to read, write, or infer data belonging to another school.

**Verification checklist for every Prisma query:**
- Does the `where` clause include `schoolId`?
- Is `schoolId` sourced from the authenticated session — not from the request body or URL?
- Does the API route validate that the target record's `schoolId` matches the session?

```typescript
// Correct — schoolId from session, not from request
const schoolId = session.user.schoolId
const invoice = await prisma.invoice.findUnique({
  where: { id: params.id, schoolId }  // ← if schoolId doesn't match, returns null
})
if (!invoice) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

// Wrong — schoolId from request body allows a school to query another school's data
const { schoolId } = await req.json()
```

---

## Authentication

- All admin routes require a valid session with `role` of `owner`, `bursar`, `accountant`,
  or `admin`.
- Parent portal routes require a valid session with `role` of `parent`.
- A parent may only access their own wards — filter by `parentId === session.user.id`.
- OTP login tokens expire in 10 minutes. One-time use only.
- Sessions expire after 8 hours of inactivity for admin users.

### Role Permissions

| Action | Owner | Bursar | Accountant | Admin | Parent |
|--------|-------|--------|------------|-------|--------|
| View financial dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Generate / issue invoices | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve / reject payments | ✅ | ✅ | ❌ | ❌ | ❌ |
| Record cash payments | ✅ | ✅ | ✅ | ❌ | ❌ |
| Apply discounts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lock / unlock terms | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage students / parents | ✅ | ❌ | ❌ | ✅ | ❌ |
| View own ward balance | ❌ | ❌ | ❌ | ❌ | ✅ |
| Upload payment proof | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## File Uploads (Receipt Proofs)

- Generate presigned PUT URLs server-side with a 15-minute expiry.
- The PUT URL must restrict `Content-Type` to `image/jpeg`, `image/png`, `application/pdf`.
- Validate file size server-side before issuing the presigned URL — reject anything over 10MB.
- Store only the R2 object key in the database — never the full URL.
- Generate presigned GET URLs on demand with a 15-minute expiry when serving files.
- Never serve receipt files through the app server — always via presigned R2 URLs.
- Object keys must include `school_id` as a prefix: `{schoolId}/receipts/{paymentId}/{filename}`.

---

## Flutterwave Webhook Security

Flutterwave webhooks are part of Phase 1 (for Standard Checkout payment verification):
- Verify the `verif-hash` header against `FLW_WEBHOOK_SECRET` before processing any event.
- Reject with `400` if the hash does not match — log the attempt.
- Process webhooks idempotently — check if the transaction reference has already been processed.
- Never trust the webhook payload amount alone — re-verify the transaction via the Flutterwave
  Verify Transaction API before marking a payment as approved.

```typescript
const hash = req.headers.get('verif-hash')
if (hash !== process.env.FLW_WEBHOOK_SECRET) {
  return Response.json({ error: 'Invalid signature' }, { status: 400 })
}
```

---

## Audit Log Integrity

The `AuditLog` table is append-only. These constraints must be enforced:

1. No `UPDATE` or `DELETE` queries on `AuditLog` — ever, for any reason.
2. The Supabase/Postgres role used by the app must not have `DELETE` permission on `AuditLog`.
3. AuditLog rows must be written in the same `prisma.$transaction` as the mutation they record.
4. `previousValue` and `newValue` are JSONB snapshots — always serialise the full record state.
5. `actorName` is stored as a snapshot at write time — it must not reference the user record by
   FK alone, because names can change.

---

## Term Locking

When a term's `status` is `locked`:
- The API must return `{ error: 'Term is locked', code: 'TERM_LOCKED' }` for any write to
  `Invoice`, `Payment`, or `DiscountApplication` records belonging to that term.
- Check lock status in the API route before executing any mutation.
- The check must be server-side — never rely on the client to enforce this.
- Only users with role `owner` may unlock a term.

---

## Input Sanitisation

- All API inputs pass through Zod before touching the database.
- String fields used in database queries must be validated for type and length.
- UUIDs from URL params must be validated as `z.string().uuid()` before use in queries.
- Never interpolate user input into raw SQL strings.

---

## Environment Variables

- Never commit `.env` files. Use `.env.example` with placeholder values.
- Secrets are stored in Doppler or Infisical — not in the repo.
- `NEXT_PUBLIC_` prefix only for values that are intentionally exposed to the browser.
- Flutterwave secret key and encryption key must never appear in client-side code.
