# Implementation Plan — Platform Dashboard & Growth CRM (Phase 2)

This plan details the design and implementation details for **Phase 2 (Advanced Insights & CRM Analytics)** of the internal WardBalance Growth Platform.

---

## User Review Required

> [!IMPORTANT]
> **Revenue Attribution & ROI Strategy:**
> - We will link converted school subscriptions back to the triggering campaign via a new relation (`conversionCampaignId` on the subscription table).
> - Dynamic school health rankings will be calculated based on billing status, term locks, and audit activity logs.

---

## Database Schema Modifications (Phase 2)

We propose adding the following relations to [schema.prisma](file:///c:/Users/esthe/OneDrive/Desktop/Wardbalance/wardbalance-app/prisma/schema.prisma) to support conversion attribution and spam tracking:

### 1. Subscription Conversion Campaign Link
```prisma
model SchoolSubscription {
  // Existing fields...
  conversionCampaignId String?
  conversionCampaign   Campaign? @relation("AttributedSubscriptions", fields: [conversionCampaignId], references: [id], onDelete: SetNull)
}

model Campaign {
  // Existing fields...
  attributedSubscriptions SchoolSubscription[] @relation("AttributedSubscriptions")
}
```

### 2. Recipient Spam Complaint Tracking
```prisma
model CampaignRecipient {
  // Existing fields...
  complainedAt  DateTime?
}
```

---

## Proposed Changes

### 1. Conversion & Health Services (`src/modules/growth/services`)

#### [NEW] [analytics.service.ts](file:///c:/Users/esthe/OneDrive/Desktop/Wardbalance/wardbalance-app/src/modules/growth/services/analytics.service.ts)
- Compute delivery rate, bounce rate, open/click rate, unsubscribe rate, and spam complaint rate per campaign.
- Aggregate MRR and subscription upgrades driven by specific campaign conversions.

#### [NEW] [health-evaluator.service.ts](file:///c:/Users/esthe/OneDrive/Desktop/Wardbalance/wardbalance-app/src/modules/growth/services/health-evaluator.service.ts)
- Dynamic evaluation of school health statuses:
  - **Healthy:** Active subscription, logged in last 7 days, 0 overdue invoices.
  - **Needs Attention:** Free trial, onboarding checklist incomplete, or 1 overdue invoice.
  - **At Risk:** Trial expiring in < 3 days, or 2+ overdue invoices, or inactive for 7-14 days.
  - **Inactive:** No active user logins in 14+ days.

### 2. Advanced API Endpoints (`src/app/api/platform`)

#### [MODIFY] [route.ts (Overview)](file:///c:/Users/esthe/OneDrive/Desktop/Wardbalance/wardbalance-app/src/app/api/platform/overview/route.ts)
- Update stats payload to include:
  - Dynamic Customer Health ratios (Count of Healthy, At Risk, Inactive).
  - 30-day chronological growth trends data (daily lead signups and converted schools count).
- Generate live founder recommendation alerts backed by resolved SQL metrics.

### 3. Frontend Enhancements (`src/app/platform`)

#### [MODIFY] [page.tsx (Overview UI)](file:///c:/Users/esthe/OneDrive/Desktop/Wardbalance/wardbalance-app/src/app/platform/page.tsx)
- Integrate Recharts line/area charts displaying chronological audience growth.
- Render interactive customer health distribution metrics.
- Expose actionable founder warnings directly linking to pre-populated campaigns.

#### [MODIFY] [page.tsx (Campaigns UI)](file:///c:/Users/esthe/OneDrive/Desktop/Wardbalance/wardbalance-app/src/app/platform/campaigns/page.tsx)
- Upgrade the past campaigns table to display advanced health indicators: open, click, bounce, unsubscribe, and complaint rates.

---

## Verification Plan

### Automated Tests (Vitest)
- Assert that school health evaluations classify trial status and login logs correctly.
- Test that UTM attribution triggers correctly assign `conversionCampaignId` upon school subscription upgrade.

### Manual Verification
- Verify layout responsiveness and chart rendering across multiple screens.
