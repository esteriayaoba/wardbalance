---
description: New component
---

# Workflow: New Component

Follow these steps every time you create a new UI component.

---

## Step 1 — Identify the surface

Answer before writing any code:
- Is this an **Admin Platform** component or a **Parent Portal** component?
- Admin → file goes in `components/admin/` or `app/(admin)/[module]/`
- Parent → file goes in `components/portal/` or `app/(portal)/[module]/`

If the component is shared (e.g. a modal shell or loading spinner), it goes in `components/ui/`.

---

## Step 2 — Read the design rules

Before writing JSX, re-read `.agents/rules/design-system.md`:
- Correct breakpoints for this surface
- Correct layout pattern (sidebar vs bottom-tab)
- Status badge classes
- Naira formatting utility
- Loading and empty state patterns

---

## Step 3 — Define the props interface

```typescript
interface AdminInvoiceTableProps {
  termId: string
  classArmId?: string
}
```

All props must be typed. No implicit `any`.

---

## Step 4 — Implement data fetching

Use TanStack Query. Never `useEffect` + `fetch`.

```typescript
const { data, isLoading, isError } = useQuery({
  queryKey: ['invoices', termId, classArmId],
  queryFn: () =>
    fetch(`/api/invoices?termId=${termId}${classArmId ? `&classArmId=${classArmId}` : ''}`)
      .then(r => r.json()),
})
```

---

## Step 5 — Implement all states

Every data-driven component must handle:

- **Loading** — skeleton that matches the expected content shape
- **Error** — inline error with retry option
- **Empty** — icon + heading + sub-text + optional CTA
- **Data** — the actual content

```typescript
if (isLoading) return <ComponentSkeleton />
if (isError)   return <ErrorState message="Could not load invoices." onRetry={refetch} />
if (!data?.data.length) return <EmptyState heading="No invoices" body="Generate invoices for this term." />
return <ActualComponent data={data.data} />
```

---

## Step 6 — Implement mutations (if applicable)

Use `useMutation` from TanStack Query. Always invalidate relevant query keys on success.

```typescript
const mutation = useMutation({
  mutationFn: (input) => fetch('/api/payments', { method: 'POST', body: JSON.stringify(input) }).then(r => r.json()),
  onSuccess: () => {
    toast.success('Payment recorded')
    queryClient.invalidateQueries({ queryKey: ['invoices', termId] })
  },
  onError: () => toast.error('Something went wrong. Please try again.'),
})
```

---

## Step 7 — Check the surface-specific rules

**Admin component:**
- [ ] Renders correctly at 1280px and 1440px
- [ ] Uses shadcn `DataTable` if displaying a list
- [ ] Has bulk action support if the list supports it
- [ ] Uses `PageHeader` wrapper with title and action button

**Parent portal component:**
- [ ] Renders correctly at 360px and 390px
- [ ] All tap targets are minimum 44px height
- [ ] No horizontal scroll
- [ ] Bottom tab nav not broken by new page

---

## Step 8 — Final checklist

- [ ] Correct surface prefix in component name (`Admin` or `Parent`)
- [ ] Props fully typed — no `any`
- [ ] Loading skeleton implemented
- [ ] Empty state implemented
- [ ] Error state implemented
- [ ] Money values use `formatNaira()` with `tabular-nums`
- [ ] Status values use `StatusBadge`
- [ ] Forms use React Hook Form + Zod resolver
- [ ] `toast.error()` on mutation failure
- [ ] Query keys invalidated on mutation success
