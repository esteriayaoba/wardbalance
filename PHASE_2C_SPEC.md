# WardBalance Phase 2C — Subscription & Billing Module

## Product Design Engineering Specification

---

## Table of Contents

1. [Product Experience Specification](#1-product-experience-specification)
2. [Billing State Machine](#2-billing-state-machine)
3. [UX Specifications](#3-ux-specifications)
4. [Design System Specification](#4-design-system-specification)
5. [Notification Matrix](#5-notification-matrix)
6. [Analytics & Product Metrics](#6-analytics--product-metrics)
7. [Acceptance Criteria](#7-acceptance-criteria)
8. [Final Validation](#8-final-validation)

---

## 1. Product Experience Specification

### 1.1 Build Boundary

Phase 2C introduces the first-ever recurring billing capability for WardBalance. Currently, all plans are free and static — plan selection happens once during signup with no payment, no enforcement, and no upgrade path. This phase makes WardBalance a revenue-generating product.

#### In Scope

- Subscription plan catalogue (managed, tiered)
- Recurring billing via Flutterwave (tokenized charges, standard checkout, USSD, bank transfer)
- Trial period management (30-day free trial)
- Plan enforcement middleware (runtime gating of features by plan limits)
- Subscription management UI in admin settings
- Upgrade / downgrade / cancellation / reactivation flows
- Billing history and invoice view
- Automated dunning (past-due recovery with escalation)
- Usage tracking and limit monitoring
- Subscription analytics and churn metrics
- Notification matrix (email, in-app, SMS for critical events)

#### Not in Scope (Deferred to Phase 3+)

- Multi-year contract pricing
- Custom enterprise plan builder UI
- Revenue recognition and deferred revenue accounting
- Proration engine (Phase 2C uses simple immediate upgrade/downgrade at next billing date)
- VAT/invoice generation for Nigerian tax compliance
- Usage-based billing (per-student overage billing)
- Self-serve plan changes during grace period (requires admin approval flow)
- Stripe Connect / marketplace payments

### 1.2 Complete User Journeys

#### Journey 1: Trial Signup

```
Actor: Prospective school owner
Channel: Public marketing site → Signup page
Entry: Visits /signup from pricing page, hero CTA, or direct

1. User lands on signup page with plan preselected (default: freemium)
2. User sees plan comparison summary (name, price, feature highlights)
3. User selects "Starter (Free)" or "Pro (₦50,000/term)"
   a. If Starter → signup continues with no payment method required
   b. If Pro → user is informed: "Start your 30-day free trial. No card required."
4. User completes school profile, admin account, email verification
5. On submission:
   a. School record created with planStatus = "trialing"
   b. trialEndsAt set to 30 days from now
   c. planLimits populated based on selected plan
   d. Welcome email sent with trial details and expiry date
6. User lands on setup checklist (existing Phase 2A flow)
   a. Dashboard shows trial countdown banner: "Your Pro trial ends in 28 days"
```

**Emotional arc:** Excited → Curious (plan selection) → Relieved (no payment barrier) → Goal-oriented (setup)

**Touchpoints:**
| # | Touchpoint | Surface | Channel |
|---|-----------|---------|---------|
| 1 | Pricing page | Marketing | Web |
| 2 | Signup form | Marketing | Web |
| 3 | Plan selection radio | Marketing | Web |
| 4 | Trial confirmation | Marketing | Web |
| 5 | Welcome email | In-app + Email | Email |
| 6 | Trial countdown banner | Admin | In-app |

---

#### Journey 2: Plan Selection (During Trial or Active)

```
Actor: School owner (trialing or active)
Trigger: Clicks "Subscription" or "Upgrade" in admin sidebar / banner CTA
Entry: /admin/settings/subscription

1. User sees current plan summary: name, status, renewal date, usage vs limits
2. If trialing → prominent banner: "Your trial ends in X days. Choose a plan to continue."
3. Plan comparison table shows:
   - Starter (current / free) vs Pro (₦50,000/term) vs Group (custom)
   - Feature comparison with checkmarks
   - Usage limits highlighted (e.g. "You have 42 of 50 students — Starter plan")
4. User clicks "Choose Pro" on Pro plan card
5. Confirmation dialog: "You are switching to Pro (₦50,000/term). Your plan will update immediately."
6. If trialing → no payment yet; plan upgrades at end of trial
7. If active → payment is collected immediately
```

**Emotional arc:** Informed → Comparing → Confident → Committed

---

#### Journey 3: Checkout (Flutterwave)

```
Actor: School owner
Trigger: Upgrading from free to paid, or renewing after expiration
Entry: Checkout modal within /admin/settings/subscription

1. Order summary card:
   - Plan: Pro — ₦50,000/term (3 months)
   - Total: ₦50,000
   - Billing period: First Term 2026/2027
2. Payment method selection:
   a. Card (Flutterwave tokenized charge) — default
   b. Bank Transfer (Flutterwave virtual account) — generates unique account number
   c. USSD (Flutterwave USSD code)
3. User selects preferred method
   a. Card → Flutterwave Standard Checkout redirect opens; user enters card details
   b. Bank Transfer → Flutterwave generates dedicated account; shows account details
   c. USSD → Flutterwave generates USSD code; shows code and instructions
4. Processing spinner with message:
   - "Processing your payment..."
   - "Do not close this page"
5. Success → redirect to subscription overview with confirmation
6. Failure → error dialog with retry and alternative method options
```

**Emotional arc:** Decisive → Secure → Anxious (processing) → Satisfied

**Edge cases:**
| Scenario | Handling |
|----------|----------|
| User closes Flutterwave Standard Checkout | Payment marked as `incomplete`; user can retry from billing page |
| Bank transfer timeout | Virtual account active for 24 hours; user can return later |
| Network failure during confirmation | Flutterwave webhook reconciles; UI shows "Payment pending — we'll confirm shortly" |
| Duplicate payment | Flutterwave tx_ref idempotency; webhook handler detects duplicate and refunds |

---

#### Journey 4: Successful Payment

```
Actor: School owner
Trigger: Flutterwave charge.completed webhook received

1. Flutterwave sends webhook to POST /api/webhooks/flutterwave
2. Server:
   a. Validates webhook signature (verif-hash HMAC-SHA256)
    b. Looks up subscription by flwTransactionId
   c. Updates subscription: planStatus = "active", currentPeriodEnd = now + term
   d. Creates SubscriptionInvoice record
   e. Writes AuditLog entry
   f. Triggers notification
3. User sees in-app success toast: "Payment confirmed! Pro plan is active."
4. Email sent: "Receipt: Pro Plan — ₦50,000 — [School Name]"
5. Dashboard banner updates: plan badge shows "Pro", trial countdown removed
```

**Emotional arc:** Uncertain → Relieved → Confident → Empowered

---

#### Journey 5: Failed Payment

```
Actor: School owner (card on file)
Trigger: Flutterwave charge.completed webhook or invoice.payment_failed

1. User sees error state on subscription page: red banner "Payment failed"
2. Error details shown: "Your card payment of ₦50,000 was declined. Reason: insufficient funds."
3. Three actions available:
   a. Retry payment (immediate)
   b. Use different payment method (bank transfer, USSD)
   c. Update card details
4. Dunning escalation:
   a. Day 0 (immediate): Email "Payment failed — update your payment method"
   b. Day 3: Email + SMS "Second attempt failed — your subscription will be paused"
   c. Day 7: Email + SMS "Final notice — service suspended in 24 hours"
   d. Day 8: Status → Past Due, core features locked
5. If resolved before Day 8 → back to Active, no data loss
```

**Emotional arc:** Surprised → Concerned → Frustrated → Urgent → Resolved or Disappointed

---

#### Journey 6: Retry Payment

```
Actor: School owner
Trigger: Clicks "Retry Payment" from subscription page or notification
Entry: Retry modal

1. Order summary same as initial checkout
2. If card on file → one-click retry (charge existing card)
3. If no card → full checkout flow (Journey 3)
4. Success → subscription reactivated, all features restored
5. Failure → shown error with alternative method suggestion
```

---

#### Journey 7: Subscription Renewal

```
Actor: System (automated)
Trigger: currentPeriodEnd date reached + autoRenew = true

1. Nightly cron job (BullMQ) scans subscriptions where:
   - planStatus = "active"
   - autoRenew = true
   - currentPeriodEnd <= now + 3 days (renewal window)
2. 7 days before renewal:
   - Email: "Your Pro plan renews on [date] — ₦50,000 will be charged"
3. On renewal date:
   - Attempt auto-charge via Flutterwave
   - Success → new SubscriptionInvoice, status remains "active"
   - Failure → enter dunning flow (Journey 5)
4. Post-renewal:
   - In-app banner: "Plan renewed successfully"
   - Email receipt
   - Dashboard badge shows new period dates
```

---

#### Journey 8: Upgrade

```
Actor: School owner (currently on paid plan or crossing trial → paid)
Trigger: Clicks "Upgrade" from subscription page

1. Current plan shown vs available upgrade options
2. Feature comparison with diff highlighting (new features in green)
3. Proration information: "Your remaining Starter balance of ₦X will be credited"
4. Confirmation dialog:
   - New plan: Pro → ₦50,000/term
   - Next billing date: [date]
   - Amount due today: ₦50,000 (or prorated amount)
5. User confirms → Flutterwave checkout (Journey 3)
6. On success:
   - Plan updated immediately
   - Limits increase take effect instantly (no restart required)
   - Invoice generated for prorated amount
   - Email confirmation sent
```

**Emotional arc:** Growth-oriented → Confident → Committed → Satisfied

---

#### Journey 9: Downgrade

```
Actor: School owner (currently on Pro)
Trigger: Clicks "Downgrade" from subscription page

1. Warning dialog:
   - "You are downgrading to Starter (Free)."
   - "You will lose access to: [list Pro features]"
   - "You have 320 of 500 students used. Starter allows 50. Excess students will be flagged."
   - "Data will not be deleted — features will be locked until you upgrade again."
2. User confirms → downgrade scheduled for next billing period end
3. Current period continues with Pro features until period end
4. At period end:
   - planStatus stays "active" but plan downgrades
   - planLimits updated
   - Middleware enforces new limits
   - Email sent: "Your plan has been updated to Starter"
5. If user exceeds new limits (e.g. >50 students):
   - Warning banner on dashboard: "You have 320 students. Starter supports 50."
   - Core functionality preserved
   - Bulk actions locked (can't generate invoices until within limits)
   - Upgrade CTA prominent in banner
```

**Emotional arc:** Feeling constrained → Hesitant → Resigned → Adjusted

---

#### Journey 10: Cancellation

```
Actor: School owner
Trigger: Clicks "Cancel Subscription" from subscription page

1. Soft cancellation dialog (retention-first):
   - "We're sorry to see you go."
   - Option 1: "Downgrade to Starter (Free)" — retains access
   - Option 2: "Take a break" — pause for 30 days, data preserved
   - Option 3: "Cancel completely" — subscription ends at period close
2. If Option 3:
   - Reason selection: Cost | Not using | Switching | Other
   - Optional feedback text area
3. Confirmation:
   - "Your Pro plan will remain active until [period_end]. After that, access will be limited."
   - "Your school data will be preserved for 90 days after cancellation."
   - "You can reactivate anytime before then with all data intact."
4. Post-cancellation:
   - planStatus = "cancelled", cancelAtPeriodEnd = true
   - Dashboard shows: "Access until [date]"
   - Auto-renew turned off
   - Email confirmation sent
   - 7 days before access loss: email reminder
```

**Emotional arc:** Frustrated/Leaving → Heard (empathy) → Informed → Resolved

---

#### Journey 11: Reactivation

```
Actor: Former school owner (cancelled within 90 days)
Trigger: Clicks "Reactivate" from login or email link

1. If within 90-day data retention window:
   - "Welcome back! Your school data is intact."
   - Choose plan: Starter (Free) or Pro (₦50,000/term)
   - If Pro → full checkout (Journey 3)
   - If Starter → instant reactivation
2. On reactivation:
   - planStatus = "active"
   - All data restored immediately
   - Email: "Welcome back to WardBalance"
   - Dashboard shows full state with no data loss
3. If past 90 days:
   - "Your data has been archived. You'll need to start fresh."
   - Redirect to new signup flow
```

**Emotional arc:** Curious → Hopeful → Relieved (data intact) → Re-engaged

---

#### Journey 12: Trial Expiry

```
Actor: School owner (trialing Pro)
Trigger: trialEndsAt = today, no plan upgrade completed

1. Day -7 (7 days before expiry):
   - Email: "Your Pro trial ends in 7 days"
   - In-app banner: yellow, "Trial ends in 7 days — choose a plan"
2. Day -3:
   - Email: "Your Pro trial ends in 3 days"
   - In-app banner: orange, "Upgrade now to keep Pro features"
3. Day -1:
   - Email: "Your trial ends tomorrow"
   - In-app banner: red, "Last day! Upgrade to keep your Pro features"
4. Day 0 (expiry):
   - At midnight: planStatus = "expired", plan downgraded to Starter
   - Pro features locked (bulk invoice generation, advanced reports, etc.)
   - Data preserved
5. Post-expiry (Days 1-7 — grace period):
   - Login still works
   - Dashboard banner: "Your trial has ended. You're on Starter. Upgrade to Pro"
   - Upgrade CTA prominent
   - Daily email for 3 days: "Upgrade to Pro and regain [feature list]"
6. Day 8+:
   - Standard active Starter user experience
   - Subscription page still shows upgrade path
```

**Emotional arc:** Engaged → Reminded → Anxious → Disappointed → Adjusted OR Upgraded

---

#### Journey 13: Grace Period

```
Actor: School owner (payment failed, within 7-day grace)
Trigger: Payment failed, planStatus = "past_due"

1. Dashboard: Red persistent banner "Action required — payment failed"
2. Core features: fully accessible (grace period = no feature loss)
3. Subscription page: Large "Resolve Payment" CTA
4. Dunning emails at Day 0, Day 3, Day 7 (Journey 5)
5. Day 8: planStatus = "suspended"
   - Login still works
   - Dashboard visible (read-only)
   - Cannot generate invoices, record payments, or export reports
   - Data intact
   - "Reactivate" CTA leads to payment resolution
6. Day 30 (suspended → expired):
   - If unresolved for 30 days past due → planStatus = "expired"
   - Access limited to data export only (30-day window)
   - Data preserved for 90 days total from expiry
```

**Emotional arc:** Caught off-guard → Concerned → Urgent → Resolved OR Stressed → Final loss

---

#### Journey 14: Past Due Recovery

```
Actor: School owner (suspended, within data retention window)
Trigger: Clicks "Reactivate" or resolves payment

1. User sees suspension banner with amount owed and days remaining
2. CTA: "Pay ₦50,000 to reactivate"
3. Flutterwave checkout (Journey 3)
4. On success:
   - All features restored immediately
   - planStatus = "active"
   - New period calculated from reactivation date
   - Email: "Welcome back! Your subscription is active."
5. On failure → dunning continues from where it left off
```

---

### 1.3 User Journey Map (Visual Summary)

```
                          ┌─────────────────────────────────────────────┐
                          │           LANDING / SIGNUP                  │
                          │   (Starter free / Pro 30-day trial)         │
                          └───────────────────┬─────────────────────────┘
                                              │
                                    ┌─────────▼─────────┐
                                    │   TRIALING (30d)   │◄──────────────┐
                                    │  (if Pro selected) │               │
                                    └──┬──────────────┬──┘               │
                                       │              │                  │
                          ┌────────────▼──┐    ┌──────▼───────────┐      │
                          │  UPGRADE TO   │    │  TRIAL EXPIRES   │      │
                          │    PAID       │    │  → Starter free  │      │
                          └───────┬───────┘    └────────┬─────────┘      │
                                  │                      │               │
                    ┌─────────────▼──────────────────────▼────┐          │
                    │              ACTIVE                      │          │
                    │  (Starter free / Pro paid / Group)        │─────────┘
                    └──┬──────────┬──────────┬──────────┬──────┘ Reactivate
                       │          │          │          │
              ┌────────▼──┐ ┌────▼────┐ ┌───▼────┐ ┌──▼───────┐
              │ PAYMENT   │ │UPGRADE  │ │DOWN-   │ │CANCEL    │
              │ FAILED    │ │         │ │GRADE   │ │          │
              └─────┬─────┘ └─────────┘ └────────┘ └─────┬────┘
                    │                                     │
              ┌─────▼──────┐                     ┌───────▼────────┐
              │ PAST DUE   │                     │  CANCELLED     │
              │ (7d grace) │                     │  (active until  │
              └─────┬──────┘                     │  period end)    │
                    │                            └───────┬────────┘
              ┌─────▼──────┐                             │
              │ SUSPENDED  │                      ┌──────▼──────────┐
              │ (read-only)│                      │ DATA PRESERVED  │
              └─────┬──────┘                      │  (90 days)      │
                    │                             └──────┬──────────┘
              ┌─────▼──────┐                             │
              │  EXPIRED   │◄────────────────────────────┘
              │ (data lost │
              │  after 90d)│
              └────────────┘
```

---

## 2. Billing State Machine

### 2.1 States

| State | Description | Visibility |
|-------|-------------|-----------|
| `trialing` | School is in free trial period. Full feature access. | Admin dashboard + parent portal |
| `active` | Subscription is paid and current. Full feature access. | All surfaces |
| `past_due` | Payment failed. Grace period (7 days). Full access still granted. | Admin (with warning banner) |
| `suspended` | Grace period expired. Limited read-only access. Core features locked. | Admin (limited) |
| `cancelled` | CancelAtPeriodEnd. Full access until period end. | Admin (with expiry banner) |
| `expired` | Trial ended or cancellation took effect. Downgraded to Starter free tier. | Admin (limited) |
| `reactivating` | User clicked reactivate; payment in progress. | Admin (processing state) |

### 2.2 Transition Matrix

| From | To | Trigger | Actions |
|------|----|---------|---------|
| `trialing` | `active` | User upgrades to paid plan + payment succeeds | Set planStatus=active, set currentPeriodEnd, clear trialEndsAt, email receipt |
| `trialing` | `expired` | trialEndsAt passed + no upgrade | Downgrade to Starter plan, lock Pro features, email notification |
| `active` | `past_due` | Payment charge fails | Set planStatus=past_due, start dunning sequence (7 day clock) |
| `active` | `active` | Renewal payment succeeds | Extend currentPeriodEnd, email receipt |
| `active` | `cancelled` | User cancels subscription | Set cancelAtPeriodEnd=true, set planStatus=cancelled, turn off autoRenew |
| `active` | `active` (upgraded) | User upgrades plan | Update plan, currentPeriodEnd recalculated, email confirmation |
| `active` | `active` (downgraded) | User downgrades plan (takes effect at period end) | Schedule downgrade, email confirmation with effective date |
| `past_due` | `active` | Retry payment succeeds | Clear past_due, restore status, email receipt |
| `past_due` | `suspended` | 7-day grace period expires | Set planStatus=suspended, lock features, email final notice |
| `suspended` | `active` | User resolves payment | Restore all features, set planStatus=active, email confirmation |
| `suspended` | `expired` | 30 days in suspended state | Set planStatus=expired, archive data (90-day window), email final notice |
| `cancelled` | `active` | User reactivates before period end | Set planStatus=active, clear cancelAtPeriodEnd, email confirmation |
| `cancelled` | `expired` | Period end reached + no reactivation | Set planStatus=expired, downgrade to Starter, data enters 90-day retention |
| `expired` | `active` | User reactivates within 90 days | Restore all data, set planStatus=active, set new period dates, email confirmation |
| `expired` | — | 90 days past expiry | Data permanently deleted (GDPR purge) |
| `trialing` | `trialing` | Trial reminder sent | No state change; system event |
| `active` | `active` | Usage limit reached (warning) | No state change; dashboard warning banner displayed |

### 2.3 State Constraints

| State | Invoices | Payments | Reports | Exports | Student CRUD | Settings | Dashboard |
|-------|----------|----------|---------|---------|-------------|----------|-----------|
| `trialing` | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `active` | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `past_due` | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full + Warning |
| `suspended` | ❌ Locked | ❌ Locked | ❌ Locked | ❌ Locked | ✅ View only | ✅ Billing only | ✅ Read-only |
| `cancelled` | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ + Expiry banner |
| `expired` | ❌ Locked | ❌ Locked | ❌ Locked | ✅ Export only (30d) | ✅ View only | ✅ Billing only | ✅ Read-only + Upgrade |
| `reactivating` | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Processing banner |

### 2.4 Permitted API Actions Per State

```typescript
const STATE_PERMISSIONS: Record<PlanStatus, {
  canGenerateInvoices: boolean;
  canRecordPayments: boolean;
  canExportReports: boolean;
  canManageStudents: 'full' | 'view' | 'none';
  canManageSettings: 'full' | 'billing_only' | 'none';
  canAccessDashboard: boolean;
}> = {
  trialing:     { canGenerateInvoices: true, canRecordPayments: true, canExportReports: true, canManageStudents: 'full', canManageSettings: 'full', canAccessDashboard: true },
  active:       { canGenerateInvoices: true, canRecordPayments: true, canExportReports: true, canManageStudents: 'full', canManageSettings: 'full', canAccessDashboard: true },
  past_due:     { canGenerateInvoices: true, canRecordPayments: true, canExportReports: true, canManageStudents: 'full', canManageSettings: 'full', canAccessDashboard: true },
  suspended:    { canGenerateInvoices: false, canRecordPayments: false, canExportReports: false, canManageStudents: 'view', canManageSettings: 'billing_only', canAccessDashboard: true },
  cancelled:    { canGenerateInvoices: true, canRecordPayments: true, canExportReports: true, canManageStudents: 'full', canManageSettings: 'full', canAccessDashboard: true },
  expired:      { canGenerateInvoices: false, canRecordPayments: false, canExportReports: false, canManageStudents: 'view', canManageSettings: 'billing_only', canAccessDashboard: true },
  reactivating: { canGenerateInvoices: true, canRecordPayments: true, canExportReports: true, canManageStudents: 'full', canManageSettings: 'full', canAccessDashboard: true },
};
```

---

## 3. UX Specifications

### 3.1 Global Patterns (Apply to All Billing Workflows)

#### Loading States

| Pattern | Implementation | Duration |
|---------|---------------|----------|
| Page load (subscription overview) | Skeleton screen (3 card placeholders + 1 table placeholder) | Until API resolves |
| Checkout processing | Full-screen overlay spinner with message + spinner icon | Until webhook confirms or 30s timeout |
| Plan change processing | Inline spinner on CTA button + disabled state | Until API resolves |
| Invoice list loading | Skeleton table (5 rows, 4 columns) | Until API resolves |
| Payment history loading | Skeleton cards (3 cards) | Until API resolves |

#### Empty States

| Surface | Empty State | CTA |
|---------|------------|-----|
| Billing history (no invoices yet) | Illustration + "No billing history yet. Your first invoice will appear here after your next billing cycle." | None |
| Payment methods (none saved) | Illustration + "No payment methods saved. Add a card to enable auto-renewal." | "Add Payment Method" |
| Usage data (fresh account) | "Usage data will appear here as you add students and generate invoices." | None |
| Plan change history | "No plan changes recorded yet." | None |

#### Error States

| Scenario | Error Display | Recovery Action |
|----------|--------------|-----------------|
| Payment card declined | Red banner at top of checkout: "Your card was declined. [reason]" | "Try again" + "Use different method" buttons |
| Network timeout during checkout | Yellow banner: "We couldn't confirm your payment. It may still be processing." | "Check Status" (polls API) + "Contact Support" |
| Flutterwave Standard Checkout fails to load | Red banner: "Payment gateway unavailable. Please try again." | "Retry" button |
| API failure loading subscription | Inline error card: "Could not load subscription details." | "Retry" button + "Refresh page" link |
| Webhook delayed (>5 min) | Checkout shows: "Payment received! We're confirming it now. This usually takes a moment." | Auto-polls until confirmed |
| Plan upgrade fails after charge | Red banner: "Payment succeeded but plan update failed. Contact support." | "Contact Support" button (pre-filled email) |

#### Success States

| Action | Success Feedback | Next CTA |
|--------|-----------------|----------|
| Plan upgraded | Green toast: "Plan upgraded to Pro!" | "View Subscription" |
| Payment completed | Green toast + confetti: "Payment confirmed! ₦50,000" | "View Receipt" |
| Plan cancelled | Yellow informational banner: "Your plan will remain active until [date]." | "Reactivate" (subtle) |
| Payment method added | Green toast: "Card saved successfully" | None |
| Trial converted | Green toast + confetti: "Welcome to Pro!" | "Explore Pro Features" |
| Subscription reactivated | Green toast: "Welcome back! Your subscription is active." | "Go to Dashboard" |

#### Retry Flows

| Failure Point | Auto-Retry | Manual Retry | Idempotency Key |
|--------------|-----------|-------------|-----------------|
| Card payment declined | Never (will fail again) | "Retry Payment" button | flwTransactionId |
| Network timeout on confirmation | 3 attempts, 5s apart | "Check Status" button | idempotency key |
| Webhook not received | Cron job verifies pending transactions every 15 min | "Refresh Status" button | flwTransactionId |
| Flutterwave Standard Checkout load failure | Auto-retry once | "Retry" button | N/A |

#### Offline Behaviour

| Context | Behaviour |
|---------|-----------|
| Subscription page (cached) | Show cached plan data with "Last updated: [time]" indicator. Stale data OK for viewing. |
| Checkout | Blocked entirely — "You need an internet connection to process payments." |
| Plan change | Blocked — "You need an internet connection to change your plan." |
| Invoice list (cached) | Show cached invoices. "Pull to refresh" updates when online. |
| Payment method changes | Blocked — require connectivity. |

#### Timeout Handling

| Operation | Client-Side Timeout | Server-Side Timeout | UX Behaviour |
|-----------|--------------------|--------------------|--------------|
| Flutterwave Standard Checkout | 5 min | 30 min (webhook) | "Your payment session has expired. Please try again." |
| Flutterwave bank transfer | 24 hours (virtual account active) | — | "Your payment account is active for 24 hours." |
| Flutterwave USSD | 30 min | — | "Your USSD code expires in 30 minutes." |
| API: get subscription | 10s | 30s | Skeleton → "Taking longer than expected" → "Retry" |
| API: update plan | 15s | 30s | Inline spinner → error state |
| Webhook verification | — | 5s (HMAC) | N/A |

#### Skeleton Screens

**Subscription Page Skeleton:**
```
┌──────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────┐    │
│ │ ████████████████████████                    │    │  ← Plan name skeleton (60% width)
│ │ ████████                                    │    │  ← Status badge skeleton (30% width)
│ │ ████████████████████████████████████████    │    │  ← Price skeleton (80% width)
│ └────────────────────────────────────────────┘    │
│ ┌────────────────────────────────────────────┐    │
│ │ ██████████████████████████████████          │    │  ← Section title
│ │ ████████  ████████  ████████  ████████       │    │  ← Metric cards (4 columns)
│ └────────────────────────────────────────────┘    │
│ ┌────────────────────────────────────────────┐    │
│ │ ████████████████████████████████████████    │    │  ← Table header
│ │ ████  ████████  ████████  ████████  ████   │    │  ← Table row 1
│ │ ████  ████████  ████████  ████████  ████   │    │  ← Table row 2
│ │ ████  ████████  ████████  ████████  ████   │    │  ← Table row 3
│ └────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

#### Progressive Disclosure

| Pattern | Application |
|---------|------------|
| Plan comparison: collapsed → expanded features | "Show all features" toggle on plan cards |
| Invoice detail: summary → line items | Tap to expand individual invoices |
| Usage breakdown: total → per category | "View details" link under usage bars |
| Billing history: last 6 months → full archive | "Load more" pagination |
| Dunning timeline: current step → full schedule | "What happens next?" collapsible section |

#### Confirmation Dialogs

| Action | Dialog Content | Buttons |
|--------|---------------|---------|
| Upgrade plan | "You are upgrading to Pro (₦50,000/term). Features will be available immediately." | Cancel | Confirm & Pay |
| Downgrade plan | "You are downgrading to Starter (Free). You will lose: [feature list]. Changes take effect at the end of your current billing period." | Keep Pro | Confirm Downgrade |
| Cancel subscription | "Your subscription will remain active until [date]. After that, access will be limited. Your data will be preserved for 90 days." | Keep Subscription | Confirm Cancellation |
| Remove payment method | "This card will no longer be used for auto-renewal. Ensure you have another method saved." | Cancel | Remove |
| Retry failed payment | "A payment of ₦50,000 for Pro plan will be attempted." | Cancel | Retry Payment |

### 3.2 Per-Screen Specifications

#### Screen: Subscription Overview (`/admin/settings/subscription`)

```
┌──────────────────────────────────────────────────────────┐
│  Subscription & Billing                                    │
│  ──────────────────────────────────────────────────────   │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  CURRENT PLAN                  [Manage] [Upgrade]    │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  Pro Plan  ● Active                           │   │  │
│  │  │  ₦50,000/term   Next billing: 15 Oct 2026    │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  USAGE & LIMITS                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │ Students │  │  Staff   │  │  Storage │          │  │
│  │  │ 42 / 500 │  │ 3 / 5    │  │ 2.1 / 10 │          │  │
│  │  │ ████░░░░ │  │ ████░░░  │  │ ██░░░░░░ │          │  │
│  │  └──────────┘  └──────────┘  └──────────┘          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  BILLING HISTORY                                     │  │
│  │  ┌────────┬──────────┬────────┬────────┬─────────┐  │  │
│  │  │ Date   │ Plan     │ Amount │ Status │ Receipt │  │  │
│  │  ├────────┼──────────┼────────┼────────┼─────────┤  │  │
│  │  │ 15 Jul │ Pro      │ ₦50k  │ Paid   │ [PDF]   │  │  │
│  │  │ 15 Apr │ Pro      │ ₦50k  │ Paid   │ [PDF]   │  │  │
│  │  │ 15 Jan │ Pro      │ ₦50k  │ Paid   │ [PDF]   │  │  │
│  │  └────────┴──────────┴────────┴────────┴─────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  PAYMENT METHODS                    [Add Method]    │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │ 💳 Visa •••• 4242    Exp: 12/27  [Remove]   │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  DANGER ZONE                     [Cancel Plan]      │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Design System Specification

### 4.1 Plan Cards

```typescript
interface PlanCardProps {
  plan: PlanId;
  name: string;
  priceDisplay: string;
  billingLabel: string;
  features: string[];
  limits: PlanLimits;
  isCurrent?: boolean;
  isPopular?: boolean;
  isDisabled?: boolean;
  onSelect: (planId: PlanId) => void;
  state: 'default' | 'selected' | 'current' | 'disabled';
}
```

**Visual spec:**
- Base: White bg, rounded-xl, border neutral-200
- Selected/hover: border-primary, ring-2 ring-primary/20
- Current: border-green-200, bg-green-50/20, green checkmark badge
- Popular: primary top border accent, "Most Popular" pill badge
- Disabled: opacity-60, cursor-not-allowed
- Price: text-headline-large font-bold, tabular-nums
- Feature list: checkmark icons (green-500), text-body-medium
- CTA button: full width, min-h-[48px]

### 4.2 Pricing Comparison Table

```typescript
interface PricingTableProps {
  plans: PricingPlan[];
  currentPlanId: PlanId;
  highlightedFeatures?: string[]; // features to emphasise with diff
}
```

**Visual spec:**
- Header row: plan names + price + CTA
- Feature rows: alternating white/grey-50 backgrounds
- Checkmarks (green-500) or dashes (neutral-300) per cell
- "You are here" badge on current plan column
- Popular plan column gets subtle background tint
- Sticky header on scroll
- Mobile: horizontal scroll with sticky first column (plan names)

### 4.3 Usage Bars

```typescript
interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  unit: string;
  variant?: 'default' | 'warning' | 'critical';
  showPercentage?: boolean;
}
```

**Visual spec:**
- Label + value on same line: "Students 42/500"
- Bar height: 8px, rounded-full
- Background: neutral-200
- Fill:
  - <70%: primary-500
  - 70-89%: amber-500 (warning)
  - 90-100%: red-500 (critical)
- Animated width transition (300ms ease)
- "X remaining" text on right side

### 4.4 Progress Indicators

| Indicator | Usage | Spec |
|-----------|-------|------|
| Linear progress bar | Checkout processing, plan change | Full-width, primary-500, indeterminate animation |
| Step indicator | Plan change wizard (3 steps: Review → Pay → Confirm) | Horizontal steps with numbers, active = primary, completed = green, future = neutral |
| Circular spinner | Inline action buttons, overlay processing | 20px (inline), 48px (overlay), primary-500 |
| Skeleton blocks | Page loading | neutral-200, animate-pulse, rounded-lg |

### 4.5 Status Badges

| Status | Badge Style | Icon |
|--------|------------|------|
| Active | bg-green-100 text-green-700 | Check |
| Trialing | bg-blue-100 text-blue-700 | Clock |
| Past Due | bg-red-100 text-red-700 | AlertTriangle |
| Suspended | bg-amber-100 text-amber-700 | Lock |
| Cancelled | bg-neutral-100 text-neutral-600 | X |
| Expired | bg-neutral-100 text-neutral-500 | AlertCircle |
| Reactivating | bg-blue-100 text-blue-700 | RefreshCw |

### 4.6 Billing Tables

```typescript
interface BillingTableProps {
  invoices: SubscriptionInvoice[];
  variant: 'history' | 'pending' | 'all';
  onDownloadReceipt: (invoiceId: string) => void;
}
```

**Visual spec:**
- Full-width table with sortable columns
- Columns: Date | Description | Amount (₦) | Status | Receipt
- Status column uses StatusBadge component
- Amount column: right-aligned, tabular-nums, font-bold
- Receipt column: download icon button (neutral-500, hover:primary)
- Mobile: card-list layout (each invoice becomes a card)
- Pagination: 10 per page, "Show more" button

### 4.7 Upgrade Dialog

```typescript
interface UpgradeDialogProps {
  currentPlan: PricingPlan;
  targetPlan: PricingPlan;
  proratedAmount?: number;
  onConfirm: () => void;
  onCancel: () => void;
  state: 'idle' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}
```

**Visual spec:**
- Modal dialog (max-w-lg, centered)
- Header: "Upgrade to [Plan Name]" with icon
- Comparison summary: current (dimmed) → arrow → new (highlighted)
- Pricing detail: amount, billing period, prorated credit if applicable
- Feature diff: green checkmarks for new features gained
- CTA button: "Confirm & Pay" (primary, full-width)
- Close on Escape, click outside disabled during processing

### 4.8 Confirmation Modals

**Visual spec:**
- Modal dialog (max-w-md, centered)
- Warning icon (amber-500) for destructive actions
- Title: action being confirmed (bold)
- Description: consequences of action
- Secondary action: "Cancel" (outline button)
- Primary action: destructive variant (red-600 bg for cancellations)
- Close on Escape, click outside allowed

### 4.9 Warning Banners

| Severity | Visual | Dismissible | Animation |
|----------|--------|-------------|-----------|
| Info | Blue bg, blue-700 border-left-4 | Yes | Slide down |
| Warning | Amber bg, amber-700 border-left-4 | Yes | Slide down (persistent if critical) |
| Critical | Red bg, red-700 border-left-4 | No | Slide down + pulse attention |
| Success | Green bg, green-700 border-left-4 | Auto-dismiss after 5s | Slide down → fade out |

### 4.10 Trial Countdown Banners

```typescript
interface TrialBannerProps {
  daysRemaining: number;
  planName: string;
  onUpgrade: () => void;
}
```

**Visual spec:**
- Full-width banner below top navigation
- Background gradient based on urgency:
  - >7 days: blue-50
  - 3-7 days: amber-50
  - <3 days: red-50
- Left: clock icon + "Your [plan] trial ends in [X] days"
- Right: "Upgrade Now" primary CTA button
- Non-dismissible in final 3 days

---

## 5. Notification Matrix

### 5.1 Communication Channels

| Channel | Use Case | Priority | Cost |
|---------|----------|----------|------|
| In-app | Real-time feedback, banners, toasts | High | Free |
| Email | Receipts, important updates, dunning | High | Resend (paid) |
| SMS | Urgent payment failures, critical alerts | Medium | Termii (paid) |
| Push | Payment confirmations, renewal reminders | Medium | Free (PWA) |

### 5.2 Message Definitions

| Event | Trigger | Channel | Timing | Template Type | Purpose |
|-------|---------|---------|--------|---------------|---------|
| Trial started | Signup completed with trial | Email | Immediate | `trial_welcome` | Welcome + set expectations |
| Trial ending (7 days) | trialEndsAt = now + 7d | Email | Daily at 9am | `trial_ending_7d` | Nudge to upgrade |
| Trial ending (3 days) | trialEndsAt = now + 3d | Email + In-app | Daily at 9am | `trial_ending_3d` | Urgency nudge |
| Trial ending (1 day) | trialEndsAt = now + 1d | Email + In-app | Daily at 9am | `trial_ending_1d` | Last chance |
| Trial expired | trialEndsAt passed | Email + In-app | Immediate | `trial_expired` | Notify of downgrade |
| Payment success | `charge.completed` webhook received | Email + In-app | Immediate | `payment_success` | Receipt + confirmation |
| Payment failure (1st) | `charge.failed` webhook | Email + In-app | Immediate | `payment_failed_1` | Alert + action required |
| Payment failure (2nd) | Day 3 of dunning | Email + SMS | 9am | `payment_failed_2` | Escalated urgency |
| Payment failure (3rd) | Day 7 of dunning | Email + SMS | 9am | `payment_failed_3` | Final notice |
| Subscription renewed | Auto-charge success | Email | Immediate | `renewal_success` | Receipt |
| Subscription upgraded | User upgrade complete | Email | Immediate | `upgrade_confirmed` | Confirm + welcome |
| Subscription downgraded | Downgrade effective | Email | Immediate | `downgrade_confirmed` | Confirm + feature changes |
| Subscription cancelled | User cancellation | Email | Immediate | `cancellation_confirmed` | Confirm + data retention info |
| Cancellation expiry (7d) | 7 days before access loss | Email | Once | `cancellation_expiry_7d` | Final reminder to reactivate |
| Subscription reactivated | Reactivation complete | Email | Immediate | `reactivation_confirmed` | Welcome back |
| Usage limit reached | Student/staff count hits 90% of limit | In-app | On action | `usage_limit_warning` | Prevent surprise overages |
| Payment method expiring | Card expiry in <30 days | Email + In-app | Weekly | `payment_method_expiring` | Prevent payment failure |
| Invoice generated | Subscription invoice created | Email | Immediate | `invoice_available` | Receipt attachment |

### 5.3 Email Template Map

| Template | Subject Line | Key Variables |
|----------|-------------|---------------|
| `trial_welcome` | "Welcome to WardBalance Pro — your 30-day trial is ready" | schoolName, trialEndDate, planName |
| `trial_ending_7d` | "Your Pro trial ends in 7 days" | schoolName, daysRemaining, upgradeUrl |
| `trial_ending_3d` | "⚠️ 3 days left in your Pro trial" | schoolName, daysRemaining, upgradeUrl |
| `trial_ending_1d` | "🚨 Last day of your Pro trial — upgrade now" | schoolName, upgradeUrl |
| `trial_expired` | "Your Pro trial has ended — you're now on Starter" | schoolName, planName, upgradeUrl |
| `payment_success` | "Receipt: Pro Plan — ₦50,000 — [School Name]" | schoolName, amount, planName, period, receiptUrl |
| `payment_failed_1` | "Payment failed — update your billing info" | schoolName, amount, daysRemaining, retryUrl |
| `payment_failed_2` | "Second attempt failed — action needed" | schoolName, amount, daysRemaining, retryUrl |
| `payment_failed_3` | "Final notice: subscription will be suspended" | schoolName, amount, suspensionDate, retryUrl |
| `renewal_success` | "Your Pro plan has been renewed" | schoolName, amount, period, receiptUrl |
| `upgrade_confirmed` | "🎉 Welcome to Pro! Your upgrade is complete" | schoolName, planName, newFeatures |
| `downgrade_confirmed` | "Your plan has been updated to Starter" | schoolName, planName, featureChanges |
| `cancellation_confirmed` | "Subscription cancelled — access until [date]" | schoolName, accessEndDate, reactivationUrl |
| `cancellation_expiry_7d` | "Your WardBalance access ends in 7 days" | schoolName, accessEndDate, reactivationUrl |
| `reactivation_confirmed` | "👋 Welcome back to WardBalance!" | schoolName, planName, loginUrl |
| `payment_method_expiring` | "Your card is expiring soon" | schoolName, cardLast4, expiryDate, updateUrl |
| `invoice_available` | "New invoice available — Pro Plan" | schoolName, amount, period, invoiceUrl |

### 5.4 In-App Notification Mapping

| Event | Banner Type | Placement | Duration | Action |
|-------|------------|-----------|----------|--------|
| Payment success | Success toast | Top-right | 5s auto-dismiss | "View Receipt" |
| Payment failed | Error banner | Below nav | Persistent | "Resolve Payment" |
| Trial ending soon | Warning banner | Below nav | Until resolved | "Upgrade Now" |
| Trial expired | Info banner | Below nav | Until resolved | "Choose Plan" |
| Usage limit warning | Inline in plan card | Subscription page | Until dismissed | "Upgrade" |
| Plan upgraded | Success toast | Top-right | 5s auto-dismiss | "Explore" |
| Plan changed | Info banner | Below nav | 10s auto-dismiss | None |
| Subscription suspended | Critical banner | Below nav | Persistent | "Reactivate" |
| Cancellation confirmed | Info banner | Below nav | 10s auto-dismiss | "Undo" |
| Reactivation success | Success toast | Top-right | 5s auto-dismiss | "Go to Dashboard" |

### 5.5 Opt-Out Rules

| Notification Type | Parent Opt-Out | School Owner Opt-Out | Always Sent |
|------------------|---------------|-------------------|-------------|
| Payment success | — | — | ✅ Always |
| Payment failure | — | — | ✅ Always |
| Trial ending | — | — | ✅ Always |
| Trial expired | — | — | ✅ Always |
| Subscription suspended | — | — | ✅ Always |
| Renewal success | — | — | ✅ Always |
| Upgrade/downgrade/cancel | — | — | ✅ Always |
| Usage limit warning | — | ✅ Can disable | — |
| Payment method expiring | — | ✅ Can disable | — |
| Marketing/upsell | — | ✅ Must opt-in | — |

---

## 6. Analytics & Product Metrics

### 6.1 Funnel Events

#### Acquisition
| Event | Trigger | Properties |
|-------|---------|-----------|
| `pricing_page_viewed` | User visits /pricing | source, referrer, utm_params |
| `plan_comparison_opened` | User expands plan comparison | plan_ids_viewed |
| `plan_selected` | User clicks "Choose [Plan]" | plan_id, price, billing_period |

#### Signup → Trial
| Event | Trigger | Properties |
|-------|---------|-----------|
| `signup_started` | Signup page loaded | source, plan_id |
| `trial_started` | School created with trial | school_id, plan_id, trial_duration_days |
| `signup_completed` | Signup finished | school_id, plan_id, elapsed_min |
| `email_verified` | Email confirmed | school_id, elapsed_min |

#### Setup (existing Phase 2B funnel)
| Event | Trigger | Properties |
|-------|---------|-----------|
| `setup_started` | First setup page view | school_id, elapsed_min |
| `setup_completed` | All 12 steps done | school_id, elapsed_min |

#### Checkout
| Event | Trigger | Properties |
|-------|---------|-----------|
| `checkout_started` | User clicks "Confirm & Pay" | school_id, plan_id, amount, payment_method |
| `checkout_method_selected` | User selects payment method | school_id, payment_method_type (card/bank_transfer/USSD) |
| `checkout_flw_loaded` | Flutterwave Standard Checkout opened | school_id |
| `checkout_abandoned` | User closes checkout without completing | school_id, plan_id, amount, elapsed_seconds |
| `checkout_completed` | Webhook confirms success | school_id, plan_id, amount, payment_method, reference |

#### Payment Outcomes
| Event | Trigger | Properties |
|-------|---------|-----------|
| `payment_succeeded` | `charge.completed` webhook | school_id, plan_id, amount, payment_method, reference |
| `payment_failed` | `charge.failed` webhook | school_id, plan_id, amount, payment_method, failure_reason, attempt_number |
| `dunning_email_sent` | Dunning email dispatched | school_id, attempt_number, days_past_due |

#### Plan Changes
| Event | Trigger | Properties |
|-------|---------|-----------|
| `plan_upgraded` | User completes upgrade | school_id, from_plan, to_plan, amount |
| `plan_downgraded` | Downgrade takes effect | school_id, from_plan, to_plan, reason |
| `plan_cancelled` | User cancels | school_id, plan_id, reason, feedback |
| `plan_reactivated` | User reactivates | school_id, plan_id, days_since_cancellation |

#### Lifecycle
| Event | Trigger | Properties |
|-------|---------|-----------|
| `trial_expired` | Trial period ended | school_id, plan_id, days_used, setup_completed (bool) |
| `subscription_renewed` | Auto-renewal succeeded | school_id, plan_id, amount, period_number |
| `subscription_suspended` | Grace period expired | school_id, plan_id, days_past_due |
| `subscription_expired` | 30 days suspended | school_id, plan_id, total_days_since_cancellation |
| `usage_limit_reached` | 90% of any limit hit | school_id, limit_type, used, limit |

#### Billing Admin
| Event | Trigger | Properties |
|-------|---------|-----------|
| `billing_page_viewed` | User opens /admin/settings/subscription | school_id, plan_id, plan_status |
| `payment_method_added` | User saves card | school_id, card_brand, is_first_method |
| `payment_method_removed` | User removes card | school_id, card_brand |
| `invoice_downloaded` | User downloads receipt PDF | school_id, invoice_id, plan_id |

### 6.2 Key Performance Indicators

| KPI | Definition | Target | Measurement Period |
|-----|-----------|--------|-------------------|
| Signup → Trial conversion | % of signups that start a trial | >80% | Weekly |
| Trial → Paid conversion | % of trial users who upgrade before expiry | >25% | Monthly |
| Free → Paid conversion | % of Starter users who upgrade to Pro | >15% | Monthly |
| Activation rate | % of signups who complete setup checklist | >70% | Weekly |
| Time to first payment | Median days from signup to first payment | <45 days | Monthly |
| MRR (Monthly Recurring Revenue) | Sum of monthly subscription revenue | ₦X (growing) | Monthly |
| ARR (Annual Run Rate) | MRR × 12 | ₦X | Monthly |
| Churn rate (voluntary) | % of paying users who cancel per month | <5% | Monthly |
| Churn rate (involuntary) | % of paying users lost to payment failure | <2% | Monthly |
| Payment recovery rate | % of past-due users who recover | >40% | Monthly |
| Net Revenue Retention | Revenue from existing customers / previous period | >100% | Monthly |
| Average Revenue Per Account (ARPA) | Total MRR / total paying accounts | ₦X | Monthly |
| Dunning success rate | % of failed payments recovered via dunning | >30% | Monthly |
| Checkout abandonment rate | % of checkouts started but not completed | <20% | Weekly |
| Trial-to-paid by segment | Conversion rate segmented by school size | >20% all segments | Monthly |
| Time to value | Median days from signup to first invoice generated | <7 days | Monthly |

### 6.3 Dashboard Panels (PostHog)

| Panel | Visualisation | Events Used | Filter |
|-------|--------------|-------------|--------|
| Trial → Paid Funnel | 6-step funnel | signup_started → trial_started → setup_completed → checkout_started → checkout_completed → payment_succeeded | Last 90 days |
| Revenue Over Time | Area chart (daily) | payment_succeeded | Last 12 months, sum amount |
| MRR Trend | Line chart (monthly) | payment_succeeded, subscription_renewed | Group by month |
| Churn Rate | Line chart (monthly) | plan_cancelled | Group by month, exclude Starter→Pro |
| Dunning Funnel | 4-step funnel | payment_failed → dunning_email_sent_1 → dunning_email_sent_2 → payment_succeeded | Last 90 days |
| Plan Distribution | Pie chart | Current plan value on School records | All active schools |
| Upgrade/Downgrade Flow | Sankey | plan_upgraded, plan_downgraded | Last 90 days |
| Payment Method Distribution | Bar chart | checkout_method_selected | Last 90 days |
| Checkout Abandonment | Trend line | checkout_started, checkout_abandoned | Last 30 days, daily |
| Trial Expiry Impact | Cohort | trial_expired → plan_upgraded | Weekly cohorts, 8-week lookback |
| Usage Limit Warnings | Bar chart | usage_limit_reached | Last 30 days, by limit_type |
| Revenue by Acquisition Source | Bar chart | payment_succeeded + signup_started source | Last 90 days |

### 6.4 Alerts

| Alert | Condition | Channel | Recipient |
|-------|-----------|---------|-----------|
| MRR drop >10% MoM | Current month MRR < previous month × 0.9 | Email | Product team |
| Churn spike >8% | Monthly churn rate exceeds 8% | Email + Slack | Product team |
| Checkout abandonment >30% | 7-day rolling abandonment rate | Email | Product team |
| Flutterwave webhook failure | Webhook not received within 5 min | Slack alert | Engineering |
| Dunning recovery <20% | Monthly recovery rate below 20% | Email | Product team |
| Trial conversion <15% | Monthly trial conversion below 15% | Email | Growth team |

---

## 7. Acceptance Criteria

### 7.1 Sprint 1 — Subscription Data Model & Plan Enforcement

**Epic:** Schools can select a plan during signup and plan limits are enforced at runtime.

| # | Criteria | Category | Verification Method |
|---|----------|----------|-------------------|
| 1.1 | Prisma models for `PricingPlan`, `SchoolSubscription`, `SubscriptionInvoice`, `BillingTransaction` are created and migrated | Engineering | `prisma migrate deploy` succeeds |
| 1.2 | School model's existing `selectedPlan`/`planStatus`/`planLimits` fields are migrated to the new `SchoolSubscription` model | Engineering | Data migration preserves existing schools |
| 1.3 | `PricingPlan` seed data contains Starter, Pro, Group tiers with correct limits | Product | Seed script run; data verified in DB |
| 1.4 | Plan enforcement middleware exists and checks plan limits on: invoice generation, student creation, staff invitation | Engineering | Unit tests pass for limit checks |
| 1.5 | When a limit is exceeded, API returns `403` with structured error: `{ error: string, code: "PLAN_LIMIT_EXCEEDED", limit: string }` | Engineering | Integration test verifies error shape |
| 1.6 | Plan enforcement is **server-side only** — frontend hides unavailable actions but does not rely on client gating | Security | Audit: no plan check client-side |
| 1.7 | Every plan enforcement check is logged to AuditLog | Audit | Verify AuditLog entry on blocked action |
| 1.8 | Signup flow correctly creates SchoolSubscription with trial or active status | UX | Manual QA: signup as Pro → verify trial created |
| 1.9 | Existing School records (pre-migration) default to active Starter with no expiry | Engineering | Verify migration script |
| 1.10 | All TypeScript compiles with zero errors (`tsc --noEmit`) | Engineering | CI passes |
| 1.11 | Unit test coverage >90% for enforcement middleware | Testing | `vitest --coverage` |
| 1.12 | Accessible plan limit error states (aria-live region announcing limit errors) | Accessibility | WCAG 2.2 AA audit |

### 7.2 Sprint 2 — Subscription Management UI

**Epic:** School owners can view their subscription, compare plans, and see usage.

| # | Criteria | Category | Verification Method |
|---|----------|----------|-------------------|
| 2.1 | `/admin/settings/subscription` page renders with current plan card, usage bars, and billing history table | UX | Manual QA on 1280px+1440px |
| 2.2 | Subscription page skeleton screen renders while loading | UX | Slow network simulation |
| 2.3 | Usage bars show correct student/staff counts with colour coding | Product | Verify <70% blue, 70-89% amber, 90%+ red |
| 2.4 | Billing history table is empty-state correct for new accounts | UX | Empty state matches spec §3.1 |
| 2.5 | Plan comparison table renders all 3 tiers with feature checkmarks | UI | Visual QA at xl/2xl breakpoints |
| 2.6 | "Current Plan" badge appears on the active plan card | UI | Visual QA |
| 2.7 | "Most Popular" badge appears on Pro plan card | UI | Visual QA |
| 2.8 | Upgrade CTA is present on non-Pro plans and leads to checkout | UX | Manual QA |
| 2.9 | Usage bars update in real-time when student/staff count changes | Product | Add student → refresh subscription page |
| 2.10 | Page renders correctly at 1280px minimum | UI | Responsive QA |
| 2.11 | Keyboard navigation works for plan selection (Tab + Enter) | Accessibility | Keyboard audit |
| 2.12 | Focus-visible rings present on all interactive elements | Accessibility | Visual audit |
| 2.13 | All text is translatable (no hardcoded display strings in components) | Engineering | Verify i18n-ready pattern |
| 2.14 | Analytics events fire for `billing_page_viewed`, `plan_comparison_opened`, `plan_selected` | Analytics | PostHog dashboard confirms |

### 7.3 Sprint 3 — Flutterwave Checkout Integration

**Epic:** School owners can pay for a subscription via Flutterwave (card, bank transfer, USSD).

| # | Criteria | Category | Verification Method |
|---|----------|----------|-------------------|
| 3.1 | Flutterwave public key is configured in environment (not hardcoded) | Security | Env var check |
| 3.2 | Checkout modal opens with order summary when user clicks "Confirm & Pay" | UX | Manual QA |
| 3.3 | Flutterwave Standard Checkout redirect loads correctly for card, bank transfer, and USSD | Engineering | Test each method |
| 3.4 | Webhook endpoint `POST /api/webhooks/flutterwave` validates HMAC-SHA256 signature | Security | Unit test with forged signature → 401 |
| 3.5 | Webhook handler idempotent: duplicate `charge.completed` callbacks do not create duplicate invoices | Engineering | Integration test with duplicate webhook |
| 3.6 | Successful payment creates `SubscriptionInvoice` with correct amount, plan, period | Product | DB verification |
| 3.7 | Successful payment updates `SchoolSubscription.planStatus` to `active` | Engineering | DB verification |
| 3.8 | Successful payment writes AuditLog entry with before/after plan status | Audit | Audit log verification |
| 3.9 | Failed payment returns user to checkout with error message from Flutterwave | UX | Manual QA: use Flutterwave test card 4181 4274 1007 4849 |
| 3.10 | Checkout abandonment is detected (user closes checkout page before completion) | Analytics | `checkout_abandoned` event fires |
| 3.11 | flwTransactionId is stored on `BillingTransaction` for reconciliation | Engineering | DB verification |
| 3.12 | Checkout page is mobile-responsive at 360px minimum | UI | Responsive QA |
| 3.13 | Accessible loading announcements during checkout (aria-live="polite") | Accessibility | Screen reader audit |
| 3.14 | Timeout handling: if Flutterwave Standard Checkout doesn't load in 10s, show error with retry | UX | Manual QA with network throttle |
| 3.15 | Unit test coverage >80% for webhook handler | Testing | `vitest --coverage` |
| 3.16 | E2E test covers: select plan → checkout → payment success → redirect | Testing | Playwright test passes |

### 7.4 Sprint 4 — Trial, Dunning & Lifecycle Automation

**Epic:** Trial lifecycle, payment failure recovery, and subscription renewal work automatically.

| # | Criteria | Category | Verification Method |
|---|----------|----------|-------------------|
| 4.1 | Nightly cron job (BullMQ) checks for trial expirations and transitions `trialing` → `expired` | Engineering | Cron job log verification |
| 4.2 | Trial expiry transitions downgrade plan to Starter (preserving data) | Product | Verify DB after cron run |
| 4.3 | Trial countdown banner appears in admin dashboard at 7/3/1 days | UX | Manual QA with mocked dates |
| 4.4 | Trial reminder emails send on schedule (7d, 3d, 1d) | Notifications | Email log verification |
| 4.5 | Failed payment transitions `active` → `past_due` with 7-day grace period | Engineering | Webhook test with failing card |
| 4.6 | Dunning emails send on schedule (Day 0, 3, 7) | Notifications | Email log verification |
| 4.7 | Dunning SMS sends on Day 3 and Day 7 for urgent escalation | Notifications | SMS log verification |
| 4.8 | Grace period (7 days): all features remain accessible | Product | Manual QA during grace |
| 4.9 | Day 8: `past_due` → `suspended`; core features locked | Engineering | Integration test |
| 4.10 | Suspended state shows read-only dashboard with "Reactivate" CTA | UX | Manual QA |
| 4.11 | 30 days in `suspended` → `expired`; data enters 90-day retention window | Engineering | Integration test |
| 4.12 | Reactivation from `suspended` restores all features within 5 seconds | Performance | Timing test |
| 4.13 | Renewal cron scans subscriptions 7 days before `currentPeriodEnd` | Engineering | Cron job log verification |
| 4.14 | Auto-renewal charge attempt uses saved card via Flutterwave | Engineering | Integration test |
| 4.15 | Renewal success creates new `SubscriptionInvoice` with updated period | Product | DB verification |
| 4.16 | Every lifecycle transition writes AuditLog entry | Audit | Audit log verification |
| 4.17 | Analytics events fire for every lifecycle transition | Analytics | PostHog event verification |
| 4.18 | No data loss during any state transition (data preserved through trial → expired → reactivation) | Engineering | E2E test: create data → let expire → reactivate → verify |

### 7.5 Sprint 5 — Upgrade, Downgrade, Cancel, Reactivate

**Epic:** School owners can change plans, cancel, and reactivate self-service.

| # | Criteria | Category | Verification Method |
|---|----------|----------|-------------------|
| 5.1 | Upgrade from Starter → Pro triggers checkout and immediate plan activation | UX | Manual QA |
| 5.2 | Upgrade from Pro → Group routes to "Contact Sales" form | Product | Manual QA |
| 5.3 | Downgrade from Pro → Starter shows warning dialog with feature loss list | UX | Manual QA |
| 5.4 | Downgrade schedules effective date at period end; current plan continues | Engineering | Integration test |
| 5.5 | Cancel flow offers 3 options: downgrade, pause, cancel completely | UX | Manual QA |
| 5.6 | Cancel reason selection stores user feedback | Product | DB verification |
| 5.7 | Cancellation confirmation email includes reactivation link | Notifications | Email log |
| 5.8 | Reactivation within 90 days restores full data | Product | E2E test |
| 5.9 | Reactivation past 90 days shows "data archived, start fresh" message | UX | Manual QA |
| 5.10 | All plan changes write AuditLog entries | Audit | Audit log verification |
| 5.11 | Plan upgrade/downgrade/cancel events fire to PostHog | Analytics | PostHog verification |
| 5.12 | Danger zone UI has explicit confirmation (cannot cancel by misclick) | UX | Manual QA with rapid clicking |
| 5.13 | Cancellation can be undone within session (5-second undo toast) | UX | Manual QA |
| 5.14 | Mobile responsive: upgrade/downgrade/cancel flows work at 360px | UI | Responsive QA |

### 7.6 Sprint 6 — Payment Methods, Billing History & Polish

**Epic:** School owners can manage payment methods, view billing history, and all edge cases are handled.

| # | Criteria | Category | Verification Method |
|---|----------|----------|-------------------|
| 6.1 | "Add Payment Method" tokenizes card via Flutterwave Standard Checkout (no raw card data touches WardBalance servers) | Security | PCI compliance check |
| 6.2 | Saved card shows on payment methods list with last 4 digits, brand, expiry | UX | Manual QA |
| 6.3 | "Remove card" confirmation dialog appears | UX | Manual QA |
| 6.4 | Payment method expiry warning (30 days before) triggers in-app + email | Notifications | Integration test |
| 6.5 | Billing history table shows all invoices with status badges | UX | Manual QA |
| 6.6 | Invoice PDF receipt download is available for paid invoices | Product | Manual QA |
| 6.7 | Invoice PDF includes: school name, amount, date, plan, period, receipt number | Product | Visual QA of PDF |
| 6.8 | Pagination on billing history (10 per page, load more) | UX | Manual QA |
| 6.9 | Offline state shows cached subscription data with timestamp | UX | Manual QA with offline mode |
| 6.10 | All skeleton screens match spec (§3.1) | UI | Visual QA |
| 6.11 | All error states match spec (§3.1) | UX | Manual QA with API failure simulation |
| 6.12 | All empty states match spec (§3.1) | UI | Visual QA with fresh account |
| 6.13 | Loading states have proper aria-labels for screen readers | Accessibility | Screen reader audit |
| 6.14 | Performance: subscription page loads in <2s (API response <500ms) | Performance | Lighthouse audit |
| 6.15 | All confirmation dialogs match spec (§3.1) | UI | Visual QA |
| 6.16 | Full regression test suite passes | Testing | `npm test` |

---

## 8. Final Validation

### 8.1 Production Readiness Audit

After all 6 sprints are complete, a comprehensive independent audit must be performed before marking Phase 2C as complete.

#### Product Review

| Item | Pass Criteria |
|------|---------------|
| All user journeys match spec §1 | Walk through each journey end-to-end |
| Trial → Paid conversion works | Signup → 30-day trial → upgrade → renew |
| Upgrade/downgrade/cancel flows complete | Each path tested with Pro and Starter |
| Dunning and recovery works end-to-end | Card declines → dunning → recovery |
| No product gaps identified | All §1 "In Scope" items delivered |

#### UX Review

| Item | Pass Criteria |
|------|---------------|
| Every loading state implemented | All §3.1 loading states verified per screen |
| Every empty state implemented | All §3.1 empty states verified per screen |
| Every error state implemented | All §3.1 error states verified per screen |
| Retry flows work | Each retry flow in §3.1 tested |
| Offline behaviour correct | Airplane mode test on subscription page |
| Timeout handling works | Network throttle + slow API simulation |
| Confirmation dialogs shown for destructive actions | Cancel, downgrade, remove card tested |
| Progressive disclosure used appropriately | Feature comparison, invoice expand, usage details |
| No dead ends or confusing states | Independent UX walkthrough |

#### UI Review

| Item | Pass Criteria |
|------|---------------|
| Plan cards match §4.1 spec | Visual QA at 1440px and 360px |
| Usage bars match §4.3 spec | <70%, 70-89%, 90%+ colours verified |
| Status badges match §4.5 spec | All 7 badges visually verified |
| Billing tables match §4.6 spec | Desktop table + mobile card layout verified |
| Upgrade dialog matches §4.7 spec | All states (idle, processing, success, error) verified |
| Warning banners match §4.9 spec | All 4 severity levels verified |
| Trial banners match §4.10 spec | 7/3/1 day variants verified |
| Design tokens used consistently | No hardcoded colours, spacing, typography |
| Responsive at all breakpoints (360px → 1440px) | 5 viewport sizes tested |
| Dark mode handled (if supported) | Toggle test |

#### Architecture Review

| Item | Pass Criteria |
|------|---------------|
| Prisma models normalised correctly | Review model relationships |
| Flutterwave webhook handler is idempotent | Duplicate webhook test passes |
| State machine logic is correct | All transitions in §2 verified |
| No orphaned subscriptions | All subscriptions have valid planStatus |
| Middleware enforces limits server-side | No client-only enforcement |
| Migration scripts handle existing data | Pre-existing schools get default subscription |
| BullMQ jobs are idempotent | Duplicate cron runs don't double-charge |

#### Engineering Review

| Item | Pass Criteria |
|------|---------------|
| `tsc --noEmit` passes with zero errors | CI check |
| ESLint passes with zero warnings | CI check |
| All Zod schemas validate correctly | Unit tests pass |
| All API routes return consistent error shapes | Integration tests |
| No `any` types in new code | TypeScript strict mode audit |
| No console.log in production code | Code search |
| No hardcoded secrets or URLs | Env var audit |
| Error boundaries catch React rendering errors | Manual test with component failure |

#### Security Review

| Item | Pass Criteria |
|------|---------------|
| Flutterwave webhook signature verified | HMAC-SHA256 validation test |
 | No raw card data touches WardBalance servers | Flutterwave Standard Checkout redirect only |
| Plan enforcement is server-side only | No plan gating in client code |
| API routes enforce school_id scoping | Every query includes school_id |
| Rate limiting on checkout endpoints | 5 requests per minute per IP |
| Audit log every financial mutation | Verify each transition writes log |
| No IDOR vulnerabilities | Cross-school subscription access blocked |
| XSS prevention in billing UI | User-provided content escaped |
| CSRF protection on plan change endpoints | CSRF token required |

#### Accessibility Review

| Item | Pass Criteria |
|------|---------------|
| All pages pass automated axe-core audit | `@axe-core/playwright` on each page |
| All interactive elements have focus-visible rings | Visual QA |
| All images/icons have alt text or aria-hidden | Code audit |
| All state changes announced (aria-live) | Screen reader test |
| Colour contrast meets WCAG 2.2 AA (4.5:1) | Contrast checker |
| Touch targets ≥44px on mobile | Playwright test for all buttons |
| Keyboard navigation: Tab order is logical | Manual keyboard test |
| Screen reader: all billing info is announced | VoiceOver / NVDA audit |
| Reduced motion respects prefers-reduced-motion | System setting test |
| Error messages are descriptive and programmatically associated | aria-describedby check |

#### Performance Review

| Item | Pass Criteria | Target |
|------|---------------|--------|
| Subscription page load time | <2s | Lighthouse |
| Checkout modal open time | <1s | Timing test |
| API: get subscription | <500ms p95 | APM |
| API: update plan | <2s p95 | APM |
| Webhook processing | <3s p95 | APM |
| Cron job (trial expiry) | <30s for 10k schools | Load test |
| Cron job (renewal) | <60s for 10k schools | Load test |
| Flutterwave Standard Checkout load | <3s | Timing test |
| Invoice PDF generation | <2s | Timing test |
| Concurrent webhook processing | 100 req/s | Load test |

### 8.2 QA Regression Testing

| Area | Test Type | Scope |
|------|-----------|-------|
| Subscription lifecycle | E2E (Playwright) | Signup → trial → upgrade → payment → renew → cancel → reactivate |
| Plan enforcement | Integration | 12 enforcement points tested |
| Flutterwave webhook | E2E | Card, bank transfer, USSD, failure, duplicate |
| Dunning | Integration | 7-day grace → suspend → expire → reactivate |
| UI components | Visual regression | 20 component states captured |
| Accessibility | Automated (axe) | 10 page templates tested |
| Performance | Lighthouse | 10 runs, median score |
| Security | Manual | OWASP top 10 check |
| Mobile | Manual | 5 device sizes (360-1440px) |
| Offline | Manual | Airplane mode at 3 screens |
| Timeout | Manual | Network throttle at 4 screens |

### 8.3 Deliverables

| Deliverable | Owner | Format |
|------------|-------|--------|
| Production Readiness Score | Lead Engineer | 0-100% score with per-category breakdown |
| Remaining Risks (P0-P3) | Lead Engineer | Risk register with mitigation plan |
| Go / No-Go Recommendation | Product Manager | Written recommendation with rationale |
| Scalability Estimates | Lead Engineer | Max concurrent users, max schools, webhook throughput limits |
| Technical Debt Backlog | Engineering Team | Prioritised list of deferred improvements |

### 8.4 Production Readiness Gates

| Gate | Criteria | Blocking? |
|------|----------|-----------|
| P0 issues | Zero unresolved P0 issues | ✅ Blocking |
| P1 issues | Zero unresolved P1 issues | ✅ Blocking |
| P2 issues | <5 open P2 issues with owners assigned | ⚠️ Warning |
| P3 issues | Documented and deferred | ✅ Non-blocking |
| Security | All §8.1 security items pass | ✅ Blocking |
| Accessibility | No automated a11y failures; §8.1 items pass | ⚠️ Warning |
| Performance | All §8.1 targets met at p95 | ✅ Blocking |
| Test coverage | Unit >80%, Integration >70%, E2E critical paths covered | ✅ Blocking |
| TypeScript | `tsc --noEmit` passes | ✅ Blocking |

A sprint is only marked complete when all acceptance criteria in §7 are satisfied. Phase 2C is only marked complete when the Final Validation audit passes with no unresolved P0 or P1 issues.

---

## Prisma Schema (New Models)

```prisma
/// Available subscription plans (seeded, not user-managed)
model PricingPlan {
  id          String   @id // "starter_free", "pro_term", "group_custom"
  name        String   // "Starter", "Pro", "Group"
  tier        Int      // 0=free, 1=paid, 2=enterprise
  price       Decimal  @default(0)
  currency    String   @default("NGN")
  billingPeriod String? // "month", "term", "year", null for free/one-off
  features    Json     // feature flag map
  limits      Json     // { maxStudents, maxStaff, maxWorkspaces, paymentMethods, reports }
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  subscriptions SchoolSubscription[]

  @@map("pricing_plans")
}

/// Per-school subscription record (extends School model)
model SchoolSubscription {
  id              String   @id @default(cuid())
  schoolId        String   @unique
  school          School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  planId          String
  plan            PricingPlan @relation(fields: [planId], references: [id])
  status          String   @default("trialing") // trialing | active | past_due | suspended | cancelled | expired
  autoRenew       Boolean  @default(true)
  cancelAtPeriodEnd Boolean @default(false)
  trialStartedAt  DateTime @default(now())
  trialEndsAt     DateTime?
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  flwCustomerId String? // Flutterwave customer ID for recurring charges
  flwCardToken Json? // Saved card token for recurring charges
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  invoices        SubscriptionInvoice[]
  transactions    BillingTransaction[]

  @@index([status])
  @@index([planId])
  @@map("school_subscriptions")
}

/// Subscription invoices (bills WardBalance charges the school)
model SubscriptionInvoice {
  id              String   @id @default(cuid())
  subscriptionId  String
  subscription    SchoolSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  schoolId        String
  invoiceNumber   String   @unique // e.g. "INV-WB-2026-00001"
  planId          String
  amount          Decimal  @default(0)
  currency        String   @default("NGN")
  status          String   @default("pending") // pending | paid | failed | refunded
  periodStart     DateTime
  periodEnd       DateTime
  paidAt          DateTime?
  flwTransactionId String?
  receiptUrl      String?
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  transactions    BillingTransaction[]

  @@index([subscriptionId])
  @@index([schoolId])
  @@index([status])
  @@index([invoiceNumber])
  @@map("subscription_invoices")
}

/// Individual billing transactions (one invoice may have multiple)
model BillingTransaction {
  id              String   @id @default(cuid())
  invoiceId       String
  invoice         SubscriptionInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  subscriptionId  String
  schoolId        String
  amount          Decimal  @default(0)
  currency        String   @default("NGN")
  paymentMethod   String?  // "card", "bank_transfer", "ussd"
  flwTransactionId String? @unique
  status          String   @default("pending") // pending | success | failed
  failureReason   String?
  metadata        Json?
  createdAt       DateTime @default(now())

  @@index([invoiceId])
  @@index([flwTransactionId])
  @@index([schoolId])
  @@map("billing_transactions")
}
```

---

## Environment Variables

```bash
# Flutterwave — Phase 2C Subscription Billing
NEXT_PUBLIC_FLW_PUBLIC_KEY=
FLW_SECRET_KEY=
FLW_WEBHOOK_SECRET=
```

---

*This specification is aligned with AGENTS.md. Do not begin Phase 2C until Phase 2B is stable and deployed.*
