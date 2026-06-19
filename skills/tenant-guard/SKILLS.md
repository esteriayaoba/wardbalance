# Skill: Tenant Guard

## Purpose
Enforce school-level data isolation (multi-tenancy) on every database query and
API route. This is the most critical security control in WardBalance.

---

## The Rule in One Sentence

`schoolId` must come from the authenticated session and must appear in the `where`
clause of every Prisma query that touches school data. No exceptions.

---

## Where schoolId Must Come From

```typescript
// CORRECT — from session
const session = await getServerSession(authOptions)
const schoolId = session.user.schoolId

// WRONG — from request body (attacker-controlled)
const { schoolId } = await req.json()

// WRONG — from URL params (attacker-controlled)
const schoolId = params.schoolId
```

---

## The Tenant Guard Helper

Import and call this at the start of every API route handler:

```typescript
// lib/tenant-guard.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface TenantContext {
  schoolId: string
  userId: string
  userName: string
  role: string
}

export async function requireTenant(req: Request): Promise<TenantContext | Response> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return Response.json({ error: 'Unauthorised', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  if (!session.user.schoolId) {
    return Response.json({ error: 'Forbidden', code: 'NO_SCHOOL' }, { status: 403 })
  }

  return {
    schoolId: session.user.schoolId,
    userId:   session.user.id,
    userName: session.user.name,
    role:     session.user.role,
  }
}

// Usage in route
export async function GET(req: Request) {
  const ctx = await requireTenant(req)
  if (ctx instanceof Response) return ctx   // auth failed — return early

  // ctx.schoolId is now safe to use
  const invoices = await prisma.invoice.findMany({
    where: { schoolId: ctx.schoolId }
  })
  ...
}
```

---

## Ownership Check — Single Record Access

Before reading or mutating a single record, always verify it belongs to the school:

```typescript
export async function requireOwnership<T extends { schoolId: string }>(
  record: T | null,
  schoolId: string
): Response | T {
  if (!record) {
    return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  if (record.schoolId !== schoolId) {
    // Do not reveal existence — return 404, not 403
    return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  return record
}
```

**Always return 404 (not 403) when a record exists but belongs to another school.**
A 403 would reveal that the record exists, leaking tenant data.

---

## Prisma Query Checklist

Every Prisma call that reads or writes school data:

```typescript
// ✅ Correct — schoolId scopes every query
await prisma.student.findMany({ where: { schoolId } })
await prisma.invoice.findUnique({ where: { id, schoolId } })
await prisma.payment.update({ where: { id, schoolId }, data: { ... } })
await prisma.invoice.deleteMany({ where: { termId, schoolId } })

// ❌ Wrong — no tenant scope
await prisma.student.findMany()
await prisma.invoice.findUnique({ where: { id } })
await prisma.payment.update({ where: { id }, data: { ... } })
```

---

## Parent Portal — Additional Restriction

A parent user may only access their own wards. Add `parentId` scope:

```typescript
const session = await getServerSession(authOptions)
const schoolId = session.user.schoolId
const parentId = session.user.id

// Must scope to both school AND parent
const students = await prisma.student.findMany({
  where: { schoolId, parentId }
})

const invoices = await prisma.invoice.findMany({
  where: {
    schoolId,
    student: { parentId }   // parent can only see their own children's invoices
  }
})
```

---

## Database-Level Enforcement (Supabase RLS)

In addition to application-level checks, add Row Level Security policies on
Supabase for the `Invoice`, `Payment`, `Student`, and `Parent` tables:

```sql
-- Enable RLS
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;

-- Policy: app user can only see their school's invoices
CREATE POLICY "school_isolation" ON "Invoice"
  USING ("schoolId" = current_setting('app.current_school_id', true)::uuid);
```

Set `app.current_school_id` at the start of each database session via a Prisma middleware.
This provides a second layer of enforcement independent of application code.

---

## Tenant Guard — Verification Checklist

Run this check every time you write or review an API route:

- [ ] Session fetched via `getServerSession` before any logic
- [ ] `schoolId` extracted from session — never from request
- [ ] Route returns `401` with `AUTH_REQUIRED` if no session
- [ ] Route returns `403` with `NO_SCHOOL` if session has no schoolId
- [ ] Every `prisma.*.findMany` has `{ schoolId }` in `where`
- [ ] Every `prisma.*.findUnique` has `{ id, schoolId }` in `where`
- [ ] Every `prisma.*.update` has `{ schoolId }` in `where`
- [ ] Single-record access returns `404` (not `403`) if schoolId doesn't match
- [ ] Parent routes additionally scope by `parentId`
