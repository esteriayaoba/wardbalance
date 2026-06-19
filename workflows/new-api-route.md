---
description: This should be the rule for a new API router
---

# Workflow: New API Route

Follow these steps every time you create a new API route handler.

---

## Step 1 — Determine the route path

```
/api/[module]/route.ts              collection (GET list, POST create)
/api/[module]/[id]/route.ts         single record (GET, PATCH, DELETE)
/api/[module]/[id]/[action]/route.ts sub-action (PATCH .../verify, POST .../issue)
/api/portal/[module]/route.ts       parent-portal-only routes
```

---

## Step 2 — Define the Zod schema first

Before writing the handler, define the input schema:

```typescript
const CreatePaymentSchema = z.object({
  invoiceId:            z.string().uuid(),
  amount:               z.number().positive(),
  paymentMethod:        z.enum(['bank_transfer', 'cash', 'pos', 'cheque']),
  transactionReference: z.string().optional(),
  paymentDate:          z.coerce.date(),
})
```

---

## Step 3 — Write the handler using the scaffold from `api-route-scaffolder`

Open `skills/api-route-scaffolder/skill.md` and follow the full route template.
Every handler must in order:

1. Fetch session — return `401` if missing
2. Extract `schoolId` from session — return `403` if missing
3. Check role if the action is restricted
4. Validate request body with Zod — return `400` if invalid
5. Validate UUID path params with `z.string().uuid()`
6. Check term lock status for any financial write — return `422` if locked
7. Execute business logic
8. Use `prisma.$transaction` for any multi-table write
9. Call `writeAuditLog` inside the transaction
10. Return `{ data }` on success

---

## Step 4 — Add the tenant scope check

Verify the `tenant-guard` skill has been applied:
- `schoolId` sourced from session ✅
- Every Prisma query includes `schoolId` in `where` ✅
- Single-record access returns `404` if schoolId doesn't match ✅

---

## Step 5 — Test the route manually

Use the Antigravity built-in HTTP client or a tool like `curl` / Postman to verify:

```bash
# Missing auth — expect 401
curl -X POST /api/payments

# Wrong school — expect 404 (not 403)
curl -X GET /api/invoices/[invoice-from-other-school] -H "Authorization: Bearer [token]"

# Locked term — expect 422
curl -X POST /api/invoices -H "..." -d '{"termId": "[locked-term-id]", ...}'

# Valid request — expect 201
curl -X POST /api/payments -H "..." -d '[valid payload]'
```

---

## Step 6 — Final checklist

- [ ] Schema defined before handler
- [ ] `401` for missing session
- [ ] `403` for missing schoolId
- [ ] `400` for Zod validation failure with flattened errors
- [ ] `404` (not `403`) when record not found for this school
- [ ] `422` for term lock violation
- [ ] All Prisma queries include `schoolId`
- [ ] `prisma.$transaction` used for multi-table writes
- [ ] `writeAuditLog` called inside the transaction for financial mutations
- [ ] Correct HTTP status codes on success (200 / 201)
