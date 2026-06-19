# Code Style Rules

## TypeScript

- Strict mode is always on. `tsconfig.json` must have `"strict": true`.
- No `any`. Use `unknown` and narrow with type guards or Zod parse.
- Define Zod schemas first. Derive types using `z.infer<typeof Schema>`.
- Co-locate schemas with the module they describe.
- Prefer `type` over `interface` for data shapes. Use `interface` only for extensible contracts.
- All exported functions must have explicit return types.

```typescript
// Correct
const InvoiceSchema = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
  dueDate: z.coerce.date(),
})
type InvoiceInput = z.infer<typeof InvoiceSchema>

// Wrong
const createInvoice = async (data: any) => { ... }
```

---

## Prisma

- Always include `school_id` in every `where` clause. No exceptions.
- Use `prisma.$transaction([...])` for any multi-table write.
- AuditLog must be written inside the same transaction as the financial mutation.
- Use `Decimal` arithmetic — never native JS `+` `-` `*` on monetary values.
- Use `select` to return only the fields the client needs.
- Never use `findFirst` where `findUnique` is appropriate.

```typescript
// Correct
const invoice = await prisma.invoice.findUnique({
  where: { id: invoiceId, schoolId },
  select: { id: true, finalAmount: true, balanceDue: true, status: true }
})

// Wrong — missing schoolId scope
const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
```

---

## Decimal Arithmetic

All monetary fields are `Decimal` from `@prisma/client/runtime/library`.
Never use native JS arithmetic on these values.

```typescript
import { Decimal } from '@prisma/client/runtime/library'

// Correct
const balance = invoice.finalAmount.minus(invoice.amountPaid)
const newPaid = invoice.amountPaid.plus(new Decimal(payment.amount))

// Wrong
const balance = Number(invoice.finalAmount) - Number(invoice.amountPaid)
```

---

## API Route Pattern

Every route handler follows this exact structure:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

export async function POST(req: Request) {
  // 1. Auth
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorised', code: 'AUTH_REQUIRED' }, { status: 401 })

  // 2. Tenant scope
  const schoolId = session.user.schoolId
  if (!schoolId) return Response.json({ error: 'Forbidden', code: 'NO_SCHOOL' }, { status: 403 })

  // 3. Validate input
  const body = await req.json()
  const result = InputSchema.safeParse(body)
  if (!result.success) return Response.json({ error: result.error.flatten(), code: 'VALIDATION_ERROR' }, { status: 400 })

  // 4. Business logic (always school-scoped)
  // ...

  // 5. Return
  return Response.json({ data: output }, { status: 200 })
}
```

---

## Error Responses

Always return `{ error, code }` — never plain strings or untyped objects.

| Code | Meaning |
|------|---------|
| `AUTH_REQUIRED` | No session |
| `NO_SCHOOL` | Session exists but no schoolId |
| `VALIDATION_ERROR` | Zod parse failed |
| `NOT_FOUND` | Record not found for this school |
| `FORBIDDEN` | Record exists but belongs to another school |
| `TERM_LOCKED` | Write attempted on a locked term |
| `DUPLICATE` | Unique constraint would be violated |
| `PAYMENT_FAILED` | Flutterwave verification failed |

---

## React Components

- One component per file.
- Props interface defined at the top of the file.
- Use `shadcn/ui` primitives — never raw HTML equivalents when a component exists.
- Use TanStack Query for all server data — no `useEffect` + `fetch`.
- Use React Hook Form for all forms — no uncontrolled inputs.
- Admin components: default export named with `Admin` prefix (e.g. `AdminInvoiceTable`).
- Parent portal components: default export named with `Parent` prefix (e.g. `ParentInvoiceCard`).

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `invoice-table.tsx` |
| Components | PascalCase | `InvoiceTable` |
| Functions | camelCase | `generateInvoices` |
| DB fields | camelCase | `balanceDue` |
| Env vars | SCREAMING_SNAKE | `FLW_SECRET_KEY` |
| Zod schemas | PascalCase + Schema suffix | `CreateInvoiceSchema` |
| API routes | kebab-case segments | `/api/invoice-line-items` |

---

## What Not to Do

- Do not use `console.log` in production code — use Sentry or structured logger
- Do not store full file URLs in the database — store R2 object keys only
- Do not perform financial calculations in React components — compute server-side
- Do not call Prisma directly from React components — always via API routes
- Do not import from another module's internal files — use its exported service functions
