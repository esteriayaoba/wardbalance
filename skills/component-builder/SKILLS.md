# Skill: Component Builder

## Purpose
Build React components for WardBalance that are correctly targeted at the right
surface (Admin Platform or Parent Portal), use the correct design tokens, and
integrate with TanStack Query and React Hook Form.

---

## Before Building Any Component

Answer these questions first:

1. **Which surface?** Admin Platform (1440px desktop-first) or Parent Portal (390px mobile-first)?
2. **Does it display data?** → Use TanStack Query. Never `useEffect` + `fetch`.
3. **Does it accept user input?** → Use React Hook Form + Zod schema.
4. **Does it show money?** → Use `formatNaira()` utility and `tabular-nums` class.
5. **Does it show status?** → Use the status badge pattern from `design-system.md`.

---

## Admin Component Template

```tsx
// admin/[module]/[component-name].tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { columns } from './columns'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/admin/page-header'
import { Skeleton } from '@/components/ui/skeleton'

interface AdminInvoiceTableProps {
  schoolId: string
  termId: string
}

export default function AdminInvoiceTable({ schoolId, termId }: AdminInvoiceTableProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoices', schoolId, termId],
    queryFn: () => fetch(`/api/invoices?termId=${termId}`).then(r => r.json()),
  })

  if (isLoading) return <InvoiceTableSkeleton />
  if (isError) return <ErrorState message="Could not load invoices" />

  return (
    <div className="space-y-4">
      <PageHeader title="Invoices" action={<GenerateButton />} />
      <DataTable columns={columns} data={data.data} searchKey="studentName" />
    </div>
  )
}

function InvoiceTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
```

---

## Parent Portal Component Template

```tsx
// portal/[module]/[component-name].tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { formatNaira } from '@/lib/format'
import { StatusBadge } from '@/components/portal/status-badge'
import { Skeleton } from '@/components/ui/skeleton'

interface ParentWardCardProps {
  studentId: string
}

export default function ParentWardCard({ studentId }: ParentWardCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['ward-balance', studentId],
    queryFn: () => fetch(`/api/portal/students/${studentId}/balance`).then(r => r.json()),
  })

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm active:scale-[0.98] transition-transform">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{data.studentName}</p>
          <p className="text-xs text-gray-500">{data.className}</p>
        </div>
        <StatusBadge status={data.invoiceStatus} />
      </div>
      <div className="mt-3">
        <p className="text-xs text-gray-500">Outstanding</p>
        <p className="text-2xl font-bold tabular-nums text-gray-900">
          {formatNaira(data.balanceDue)}
        </p>
      </div>
    </div>
  )
}
```

---

## Form Component Template

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'

const RecordPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['bank_transfer', 'cash', 'pos', 'cheque']),
  transactionReference: z.string().optional(),
  paymentDate: z.coerce.date(),
})
type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>

export default function RecordPaymentForm({ invoiceId }: { invoiceId: string }) {
  const queryClient = useQueryClient()
  const form = useForm<RecordPaymentInput>({ resolver: zodResolver(RecordPaymentSchema) })

  const mutation = useMutation({
    mutationFn: (data: RecordPaymentInput) =>
      fetch(`/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, invoiceId }),
      }).then(r => r.json()),
    onSuccess: () => {
      toast.success('Payment recorded')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => toast.error('Failed to record payment'),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        {/* fields */}
        <Button type="submit" disabled={mutation.isPending} className="w-full xl:w-auto">
          {mutation.isPending ? 'Saving...' : 'Record Payment'}
        </Button>
      </form>
    </Form>
  )
}
```

---

## Checklist Before Submitting a Component

- [ ] Correct surface prefix (`Admin` or `Parent`)
- [ ] No `useEffect` + `fetch` — TanStack Query used
- [ ] Skeleton loader implemented
- [ ] Empty state implemented
- [ ] Money values use `formatNaira()` and `tabular-nums`
- [ ] Status values use `StatusBadge` component
- [ ] Form uses React Hook Form + Zod resolver
- [ ] Mutation invalidates relevant query keys on success
- [ ] Error shown via `toast.error()` on failure
