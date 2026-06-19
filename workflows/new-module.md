# Workflow: New Module

Follow these steps when creating an entirely new domain module.

---

## Step 1 — Define the module's responsibility

Write one sentence: "The [module] module is responsible for [X] and nothing else."

If you cannot write this sentence cleanly, the module boundary is wrong.
Split it or merge it with an existing module.

---

## Step 2 — Create the module directory structure

```
modules/[module-name]/
├── [module].service.ts      Business logic and Prisma queries
├── [module].schema.ts       All Zod schemas for this module
├── [module].types.ts        TypeScript types (derived from Zod where possible)
└── index.ts                 Public exports — only what other modules need
```

Create the directory and placeholder files. The actual implementation follows in the steps below.

---

## Step 3 — Add the Prisma model first

Before writing any application code, define the database model. Follow `workflows/new-prisma-model.md` to add the model to `schema.prisma`, run the migration, and regenerate the client.

The service file will reference this model, so it must exist first.

---

## Step 4 — Define the schema file

All Zod schemas for the module's API inputs and outputs go here.

```typescript
// modules/discounts/discounts.schema.ts
import { z } from 'zod'

export const CreateDiscountRuleSchema = z.object({
  name:           z.string().min(1).max(100),
  discountType:   z.enum(['fixed', 'percentage', 'conditional']),
  value:          z.number().positive(),
  appliesTo:      z.enum(['invoice_total', 'specific_fee_item']),
  feeItemId:      z.string().uuid().optional(),
  conditionType:  z.enum(['sibling_count', 'early_payment']).optional(),
  conditionValue: z.string().optional(),
})

export const UpdateDiscountRuleSchema = CreateDiscountRuleSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export type CreateDiscountRuleInput = z.infer<typeof CreateDiscountRuleSchema>
export type UpdateDiscountRuleInput = z.infer<typeof UpdateDiscountRuleSchema>
```

---

## Step 5 — Write the service file

The service file contains all Prisma queries and business logic.
It never imports from other modules' internal files — only from their `index.ts`.

The Prisma model from Step 3 is now available for queries.

```typescript
// modules/discounts/discounts.service.ts
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/modules/audit'
import type { CreateDiscountRuleInput } from './discounts.schema'

export async function createDiscountRule(
  schoolId: string,
  input: CreateDiscountRuleInput,
  actor: { id: string; name: string }
) {
  return prisma.$transaction(async (tx) => {
    const rule = await tx.discountRule.create({
      data: { schoolId, ...input, isActive: true },
    })
    await writeAuditLog(tx, {
      schoolId, actorId: actor.id, actorName: actor.name,
      action: 'create', entityType: 'DiscountRule',
      entityId: rule.id, previousValue: null, newValue: rule,
    })
    return rule
  })
}
```

---

## Step 6 — Create the API routes

```
app/api/[module-name]/route.ts
app/api/[module-name]/[id]/route.ts
```

Follow `workflows/new-api-route.md` for each route.
Import service functions from the module — never write Prisma queries inline in route handlers.

---

## Step 7 — Create the UI components

Follow `workflows/new-component.md` for each component needed by this module.

---

## Step 8 — Export from index.ts

Only export what other modules legitimately need:

```typescript
// modules/discounts/index.ts
export { createDiscountRule, getDiscountRules, applyDiscount } from './discounts.service'
export type { CreateDiscountRuleInput } from './discounts.schema'
// Do NOT export internal helpers or Prisma query functions
```

---

## Step 9 — Module checklist

- [ ] Single clear responsibility statement written
- [ ] Prisma model created first, migration applied, client regenerated
- [ ] Schema file written before service file
- [ ] Service functions are all school-scoped
- [ ] AuditLog written for every financial mutation
- [ ] API routes follow the scaffolder pattern
- [ ] Module exports only what's needed via `index.ts`
- [ ] No imports from another module's internal files
