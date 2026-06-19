# Permission Rules

## Role × Action Matrix

| Action | Owner | Bursar | Accountant | Admin | Parent |
|--------|-------|--------|------------|-------|--------|
| View financial dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Generate / issue invoices | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve / reject payments | ✅ | ✅ | ❌ | ❌ | ❌ |
| Record cash/POS/cheque payments | ✅ | ✅ | ✅ | ❌ | ❌ |
| Apply discounts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lock / unlock terms | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage fee library | ✅ | ✅ | ❌ | ✅ | ❌ |
| Manage class fee templates | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage students / parents | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manage divisions / classes | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manage school settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own ward balance | ❌ | ❌ | ❌ | ❌ | ✅ |
| Upload payment proof | ❌ | ❌ | ❌ | ❌ | ✅ |
| Download own receipts | ❌ | ❌ | ❌ | ❌ | ✅ |
| Export reports / CSV | ✅ | ✅ | ✅ | ❌ | ❌ |
| View debtor list | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## Enforcement Rules

1. **Server-side only** — never rely on the client to enforce permissions. Always check in the API route handler.
2. **Role check after auth check** — first authenticate (session exists), then authorise (role sufficient).
3. **Return 403 for insufficient role** with code `INSUFFICIENT_ROLE`.
4. **Parent role is the most restricted** — a parent may only access their own wards' data. Always scope queries by `parentId` in addition to `schoolId`.

---

## Role Check Pattern

```typescript
if (!['owner', 'bursar'].includes(session.user.role)) {
  return Response.json({ error: 'Insufficient role', code: 'INSUFFICIENT_ROLE' }, { status: 403 })
}
```

---

## Permission-Aware UI

- Admin components should check the user's role before rendering action buttons (e.g., only `owner` and `bursar` see the "Lock Term" button).
- Use a `usePermission` hook or an `can` utility:

```typescript
const can = (role: string, action: string): boolean => {
  return permissions[action]?.includes(role) ?? false
}
```

- Hiding a button is sufficient for UI clarity, but the API route MUST still enforce the same check server-side.

---

## Sensitive Actions

These actions require explicit confirmation (`AlertDialog`) because they are destructive or irreversible:

- Locking a term
- Unlocking a term
- Rejecting a payment
- Deleting a fee item that has linked invoices
- Deleting a class with enrolled students
