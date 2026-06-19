# Testing Rules

## Test Framework

| Layer | Tool | Location |
|-------|------|----------|
| Unit tests | Vitest | `src/**/*.test.ts` or `src/**/*.spec.ts` |
| Integration tests | Vitest | `tests/integration/` |
| E2E tests | Playwright | `tests/e2e/` |

---

## What to Test

### Unit tests (100% coverage required)
- Invoice total calculation (gross, discount, carryover, final)
- Discount application (fixed, percentage, conditional)
- Carryover calculation from previous term
- Balance recalculation after payment
- Fee type filtering (per_term, per_session, one_off)
- Naira formatting utility

### Integration tests (critical flows)
- Payment verification flow: submit → queue → approve → balance update → audit log
- Invoice generation flow: template → optional fees → carryover → line items → totals
- Flutterwave webhook: signature → idempotency → verify → record → update

### E2E tests (primary user flows)
- Admin: generate invoices for a class → view invoice list
- Admin: approve a pending payment → verify balance update
- Parent: view ward balance → upload payment proof → see pending status
- Parent: download receipt for approved payment

---

## Mocking Rules

### Prisma
- Use `prisma-mock` for unit tests — never connect to a real database in unit tests.
- Mock at the service boundary, not the Prisma client level.
- Each test should mock only the Prisma calls it exercises.

### Financial arithmetic
- **Never mock Decimal arithmetic.** Test with real `Decimal` values.
- Financial calculation tests should use actual `Decimal` instances and verify exact precision.

### External services
- Mock Flutterwave API calls in integration tests
- Mock R2 (Cloudflare) uploads
- Mock Resend email API
- Mock BullMQ queue operations

---

## Test Database

For integration tests:
1. Use a separate PostgreSQL database (e.g., `wardbalance_test`)
2. Run `prisma migrate deploy` before test suite
3. Seed minimal test data per test case (not a shared seed)
4. Clean up between tests — use `prisma.$transaction` to roll back test data
5. Use `beforeAll` / `afterAll` for setup and teardown

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10_000,
  },
})
```

---

## Test File Location

Co-locate unit tests with their source files:
```
modules/invoices/invoices.service.ts
modules/invoices/invoices.service.test.ts   ← co-located test
```

Integration tests go in a top-level `tests/integration/` directory:
```
tests/integration/payment-verification.test.ts
```

E2E tests go in `tests/e2e/`:
```
tests/e2e/admin-approves-payment.spec.ts
```

---

## Test Naming

```typescript
describe('InvoiceService', () => {
  describe('calculateCarryover', () => {
    it('returns previous term balance when balance_due > 0', () => { ... })
    it('returns zero when previous invoice is fully paid', () => { ... })
    it('returns zero when no previous invoice exists', () => { ... })
  })
})
```

---

## Checklist Before Merging

- [ ] All financial calculation logic has unit tests
- [ ] Integration test covers the payment verification flow
- [ ] E2E test covers the primary admin and parent flows
- [ ] `vitest run` passes with zero failures
- [ ] `npx playwright test` passes
- [ ] `tsc --noEmit` passes with zero errors
- [ ] No `console.log` left in test files
