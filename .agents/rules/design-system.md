---
trigger: always_on
---

# Design System Rules

## Two Surfaces — Two Sets of Rules

WardBalance has two intentionally different design experiences in one web app.
Never build a component that tries to serve both surfaces with the same layout.

| Surface | Design base | Min width | Primary users |
|---------|------------|-----------|---------------|
| Admin Platform | 1440px — desktop-first | 1280px | Owner, Bursar, Accountant, Admin |
| Parent Portal | 390px — mobile-first | 360px | Parents |

---

## Tailwind Breakpoints

```javascript
// tailwind.config.ts
screens: {
  'sm':  '360px',   // Parent portal minimum
  'md':  '768px',   // Tablet — admin sidebar goes icon-only
  'lg':  '1024px',  // Laptop — admin sidebar fully expanded
  'xl':  '1280px',  // Admin platform minimum
  '2xl': '1440px',  // Admin platform design base
}
```

Admin components are written at `xl`/`2xl` first, then degraded downward.
Parent portal components are written at `sm` first, then enhanced upward.

---

Rules Design System

## Token Files Are the Source of Truth

The project has one design token file. The agent must never modify them:

- `tokens/design-tokens.css` — all color values, all font sizes, weights, line heights, and font families

The token file export CSS custom properties (CSS variables) that are available globally.

## Mandatory: Use CSS Variables, Never Use Raw Values

The agent must never write hardcoded color values or typography values anywhere in this codebase.

**Wrong:**
```css
color: #1a1a1a;
font-size: 16px;
font-family: 'Inter', sans-serif;
background: #f5f5f5;
```

**Correct:**
```css
color: var(--color-text-primary);
font-size: var(--font-size-base);
font-family: var(--font-family-base);
background: var(--color-surface);
```

Before writing any style value, check the token files. If a variable exists for what you need, use it. If it does not exist, ask before inventing a new value.

## Spacing Scale

Use multiples of 4px for all spacing (margin, padding, gap). Do not use arbitrary values.

Allowed: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`

## Border Radius

The product has a consistent border radius. Use these values only:

- Small elements (badges, tags): `4px`
- Buttons and inputs: `8px`
- Cards and modals: `12px`

## Styling Method

- Use Tailwind utility classes for all layout and component styling via `className` props.
- Use CSS Modules (`.module.css` files) only for complex component-specific styles that cannot be expressed with Tailwind utilities.
- No inline `style={{}}` props except for truly dynamic values that cannot be expressed in CSS (e.g., a progress bar width driven by a number).
- All design tokens (colours, typography) are defined in `tokens/design-tokens.css` as CSS custom properties. Reference them in `tailwind.config.ts` and use Tailwind classes throughout.
- Never use raw hex values in component files — always use CSS variable references via Tailwind.


---

Always use `tabular-nums` for any monetary or numeric display.

---

## Admin Platform — Component Patterns

### Page Layout
Every admin page uses this structure:
```
<AdminLayout>           ← fixed sidebar + top bar
  <PageHeader>          ← title + breadcrumb + primary action button
  <PageContent>         ← scrollable area, max-w-screen-2xl, px-6 py-4
```

### Data Tables
Use shadcn `DataTable` with `@tanstack/react-table`.
Every table must have: column sorting, search/filter input, pagination, row selection for bulk actions.
Show a skeleton loader while data loads — never a blank table.

### Forms
Multi-field forms use a two-column grid at `xl` — single column below.
All inputs use shadcn `Input`, `Select`, `Combobox` — never raw HTML elements.
Submit button is always bottom-right, disabled while submitting, shows a spinner.

### Verification Queue
Split-pane layout: proof image on the left (50%), invoice detail on the right (50%).
Approve button: green, primary. Reject button: red, outlined. Request re-upload: gray, ghost.
Both panes scroll independently. Navigation arrows cycle through queue items without page reload.

### Dashboard Cards
Stat cards follow this pattern: icon + label + large number + trend indicator.
Pending items (verification queue, overdue count) show a badge with count.

### Status Badges
```
paid     → bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs
partial  → bg-amber-100 text-amber-700
overdue  → bg-red-100 text-red-700
draft    → bg-gray-100 text-gray-600
issued   → bg-blue-100 text-blue-700
```

---

## Parent Portal — Component Patterns

### Page Layout
```
<PortalLayout>          ← top bar (logo + notification bell) + bottom tab nav
  <PortalContent>       ← full-width, no sidebar, max-w-sm mx-auto, px-4
```

### Ward Cards
One card per child. Shows: photo/avatar placeholder, name, class, status badge,
outstanding balance in large text. Tap the card to open that child's invoices.

### Invoice Cards
Shows: term label, due date, total amount, amount paid, balance due, status badge.
Tap to expand full line-item breakdown.

### Line Item Breakdown
Full-screen sheet (bottom drawer on mobile). Lists every fee component with label
and amount. Discounts shown in green with negative sign. Carryover shown in amber.
Total at the bottom with clear separation from line items.

### Upload Flow
Three steps — one screen each, no scroll required:
1. Select invoice (pre-selected if coming from invoice card)
2. Upload file (drag-drop or file picker) + enter transaction reference
3. Confirmation screen — show submitted amount, reference, status badge "Pending"

### Tap Targets
All interactive elements minimum 44px height. Buttons full-width on mobile.
Bottom tab bar: 64px height, icons 24px, labels 11px.

---

## Shared Patterns

### Naira Formatting
Always: `₦120,000` — with ₦ symbol and thousands separator.
Never: `N120000` `120,000` `NGN 120000`

Use a shared utility:
```typescript
export const formatNaira = (amount: Decimal | number | string): string => {
  return `₦${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
}
```

### Loading States
- Tables: shadcn `Skeleton` rows matching the expected row height
- Cards: `Skeleton` matching card dimensions
- Buttons: replace label with `Loader2` spinner icon — never disable without visual feedback

### Empty States
Every list or table needs an empty state:
- Icon (from lucide-react)
- Heading: descriptive ("No invoices yet")
- Sub-text: action prompt ("Generate invoices for this term to get started")
- Optional CTA button

### Error States
Inline error below the relevant field for form validation.
Toast (shadcn `Sonner`) for async operation errors — position bottom-right on desktop,
bottom-center on mobile.

### Confirmation Dialogs
Use shadcn `AlertDialog` for destructive or irreversible actions (locking a term,
rejecting a payment). Never use native `window.confirm`.

## 3. Layout Strategy

### Admin Experience

Admin, bursar, and school owner dashboards are:

- Desktop-first
- Table-heavy
- Data-dense
- Optimized for bulk actions
- Designed for financial management workflows

Base desktop frame:

```text
1440px
```

Admin layouts should use:

- Left sidebar navigation
- Top page header
- KPI cards
- Data tables
- Filter bars
- Drawer/modal forms where appropriate

### Parent Experience

Parent portal is:

- Mobile-first
- Card-based
- Simple
- Focused on invoices, wards, balances, receipts, and payment actions

Base mobile frame:

```text
390px
```

Parents should never be forced into complex admin-style tables.

---

## 5. Material Design 3 Typography Scale

Use Material Design 3 naming conventions.

### Display

```css
--type-display-large-size: 57px;
--type-display-large-line-height: 64px;
--type-display-large-weight: 700;
--type-display-large-letter-spacing: -0.25px;

--type-display-medium-size: 45px;
--type-display-medium-line-height: 52px;
--type-display-medium-weight: 700;

--type-display-small-size: 36px;
--type-display-small-line-height: 44px;
--type-display-small-weight: 700;
```

### Headline

```css
--type-headline-large-size: 32px;
--type-headline-large-line-height: 40px;
--type-headline-large-weight: 700;

--type-headline-medium-size: 28px;
--type-headline-medium-line-height: 36px;
--type-headline-medium-weight: 700;

--type-headline-small-size: 24px;
--type-headline-small-line-height: 32px;
--type-headline-small-weight: 700;
```

### Title

```css
--type-title-large-size: 22px;
--type-title-large-line-height: 28px;
--type-title-large-weight: 700;

--type-title-medium-size: 16px;
--type-title-medium-line-height: 24px;
--type-title-medium-weight: 700;
--type-title-medium-letter-spacing: 0.15px;

--type-title-small-size: 14px;
--type-title-small-line-height: 20px;
--type-title-small-weight: 700;
--type-title-small-letter-spacing: 0.1px;
```

### Body

```css
--type-body-large-size: 16px;
--type-body-large-line-height: 24px;
--type-body-large-weight: 400;
--type-body-large-letter-spacing: 0.5px;

--type-body-medium-size: 14px;
--type-body-medium-line-height: 20px;
--type-body-medium-weight: 400;
--type-body-medium-letter-spacing: 0.25px;

--type-body-small-size: 12px;
--type-body-small-line-height: 16px;
--type-body-small-weight: 400;
--type-body-small-letter-spacing: 0.4px;
```

### Label

```css
--type-label-large-size: 14px;
--type-label-large-line-height: 20px;
--type-label-large-weight: 700;
--type-label-large-letter-spacing: 0.1px;

--type-label-medium-size: 12px;
--type-label-medium-line-height: 16px;
--type-label-medium-weight: 700;
--type-label-medium-letter-spacing: 0.5px;

--type-label-small-size: 11px;
--type-label-small-line-height: 16px;
--type-label-small-weight: 700;
--type-label-small-letter-spacing: 0.5px;
```

---

## 6. Financial Typography

Financial values must be easy to scan and align correctly in tables.

Always use:

```css
font-variant-numeric: tabular-nums;
```

for:

- Naira values
- Balances
- Invoice totals
- Payment amounts
- Percentages
- Report figures

### KPI Large

```css
font-family: var(--font-family-base);
font-size: 36px;
line-height: 40px;
font-weight: 700;
font-variant-numeric: tabular-nums;
```

### KPI Medium

```css
font-family: var(--font-family-base);
font-size: 28px;
line-height: 32px;
font-weight: 700;
font-variant-numeric: tabular-nums;
```

### Currency Value

```css
font-family: var(--font-family-base);
font-size: 14px;
line-height: 20px;
font-weight: 700;
font-variant-numeric: tabular-nums;
```

Currency format:

```text
₦120,000
₦1,250,000
₦45,500.00
```

Do not use:

```text
N120000
NGN120000
120k
```

inside financial records.

---

## 7. Color System

### Primary Blue

Main brand and primary actions.

```css
--color-primary-50: #EFF6FF;
--color-primary-100: #DBEAFE;
--color-primary-200: #BFDBFE;
--color-primary-300: #93C5FD;
--color-primary-400: #60A5FA;
--color-primary-500: #155EEF;
--color-primary-600: #1248BD;
--color-primary-700: #0F3A8F;
--color-primary-800: #0C2D6B;
--color-primary-900: #082147;
```

Use for:

- Primary buttons
- Active navigation
- Links
- Focus rings
- Brand moments

### Secondary Teal

```css
--color-secondary-50: #F0FDFA;
--color-secondary-100: #CCFBF1;
--color-secondary-200: #99F6E4;
--color-secondary-300: #5EEAD4;
--color-secondary-400: #2DD4BF;
--color-secondary-500: #0F766E;
--color-secondary-600: #0C5D57;
--color-secondary-700: #094742;
--color-secondary-800: #063530;
--color-secondary-900: #042521;
```

Use for:

- Secondary accents
- Healthy financial states
- Supporting highlights

### Semantic Colors

```css
--color-success-500: #16A34A;
--color-warning-500: #F59E0B;
--color-error-500: #DC2626;
--color-info-500: #3B82F6;
```

Use semantic colors consistently:

| State | Color |
|---|---|
| Paid / Approved | Success |
| Partially Paid / Due Soon | Warning |
| Overdue / Rejected | Error |
| Pending Verification / Info | Info |

### Neutral Colors

```css
--color-gray-50: #F9FAFB;
--color-gray-10
