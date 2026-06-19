# Workflow: New Dashboard Widget

Follow these steps when adding a new stat card, chart, or summary block to the admin dashboard.

---

## Step 1 — Classify the widget

| Type | Description | Component pattern |
|------|-------------|------------------|
| Stat card | Single number with label and trend | `DashboardStatCard` |
| Pending action | Count with link to queue | `DashboardActionCard` |
| Chart | Line/bar chart over time | `DashboardChart` (Recharts) |
| Table summary | Top N records inline | `DashboardTableSummary` |

---

## Step 2 — Create the API endpoint

Every widget fetches from its own dedicated API route — not a shared generic endpoint.
This keeps query logic isolated and allows independent caching.

```
GET /api/dashboard/revenue-summary?termId=...
GET /api/dashboard/pending-verifications
GET /api/dashboard/overdue-count?termId=...
GET /api/dashboard/recent-payments?limit=5
```

The route must:
- Require authentication and school scope (use `requireTenant`)
- Return pre-computed values — never raw records that the frontend calculates
- Be fast — use aggregation queries, not full record sets

```typescript
// api/dashboard/revenue-summary/route.ts
export async function GET(req: Request) {
  const ctx = await requireTenant(req)
  if (ctx instanceof Response) return ctx

  const termId = new URL(req.url).searchParams.get('termId')

  const result = await prisma.invoice.aggregate({
    where: { schoolId: ctx.schoolId, termId, status: { not: 'draft' } },
    _sum: { finalAmount: true, amountPaid: true, balanceDue: true },
    _count: { id: true },
  })

  return Response.json({ data: result })
}
```

---

## Step 3 — Create the widget component

```tsx
// components/admin/dashboard/revenue-summary-card.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { formatNaira } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp } from 'lucide-react'

export default function RevenueSummaryCard({ termId }: { termId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'revenue-summary', termId],
    queryFn: () => fetch(`/api/dashboard/revenue-summary?termId=${termId}`).then(r => r.json()),
    refetchInterval: 30_000,   // refresh every 30s for live dashboard feel
  })

  if (isLoading) return <Skeleton className="h-28 w-full rounded-xl" />

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <TrendingUp className="h-4 w-4" />
        Expected Revenue
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900">
        {formatNaira(data.data._sum.finalAmount ?? 0)}
      </p>
      <p className="mt-1 text-xs text-gray-400">This term</p>
    </div>
  )
}
```

---

## Step 4 — Add to the dashboard page

Dashboard stat cards sit in a 4-column grid at `2xl`, 2-column at `md`, 1-column at `sm`.

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
  <RevenueSummaryCard termId={activeTerm.id} />
  <CollectedCard termId={activeTerm.id} />
  <OutstandingCard termId={activeTerm.id} />
  <CollectionRateCard termId={activeTerm.id} />
</div>
```

---

## Step 5 — Checklist

- [ ] Dedicated API route for this widget
- [ ] Route uses `requireTenant` — school-scoped
- [ ] Returns pre-computed values, not raw records
- [ ] Widget has a skeleton loader
- [ ] Money values use `formatNaira()` with `tabular-nums`
- [ ] `refetchInterval` set for live data (30s for financial totals, 10s for pending counts)
- [ ] Added to dashboard grid in correct column span
