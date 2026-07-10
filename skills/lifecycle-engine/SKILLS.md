# Lifecycle Automation & Customer Engagement Engine

> Phase 2B Enhancement — Product Design Engineering Specification
> Status: Approved Design — Not Yet Implemented
> Last Updated: July 2026

---

## Objective

Build a reusable **Lifecycle Automation & Customer Engagement Engine** — not a single-purpose inactive-user email feature. This engine powers onboarding, activation, retention, payment reminders, and all future customer lifecycle campaigns while reusing existing infrastructure (Resend, Termii, NotificationOutbox, AuditLog, and Cron).

---

## Product Vision

WardBalance should proactively guide school owners from account creation to becoming active users through timely, relevant, and contextual communications. The system should act like a digital onboarding manager — not merely an email sender. Every communication should encourage users to complete the next meaningful action in their journey.

---

## Scope

A reusable engine that can power:

- Welcome emails
- Setup reminders
- Inactivity reminders
- Feature adoption campaigns
- Invoice generation reminders
- Parent invitation reminders
- Payment collection reminders
- Overdue payment reminders
- Subscription reminders
- Product announcements

---

## Product Journey — Lifecycle Milestones

Track these milestones; communications trigger from them, not from arbitrary timeouts:

```
Account Created
  ↓
School Created
  ↓
Setup Wizard Started
  ↓
Setup Wizard Completed
  ↓
Academic Session Created
  ↓
Classes Created
  ↓
Students Imported
  ↓
Parents Linked
  ↓
Fee Library Created
  ↓
First Invoice Generated
  ↓
First Payment Recorded
  ↓
First Parent Payment
  ↓
School Active
```

---

## Lifecycle Stages

| Stage | Meaning | Eligible Communications |
|-------|---------|------------------------|
| `NEW` | Account created, nothing done | Welcome, setup intro |
| `ONBOARDING` | Setup started but incomplete | Step reminders, how-tos |
| `ACTIVATING` | Setup complete, first invoice pending | Invoice generation prompt |
| `ACTIVE` | First invoice generated, payments flowing | Payment reminders, feature announcements |
| `AT_RISK` | Previously active, now dormant (no login 30d+) | Re-engagement, feature tips |
| `DORMANT` | No activity for 60d+ | Win-back, then archival notice |

---

## Trigger Engine

Configurable triggers — not hardcoded:

| Trigger | Condition | Output Stage |
|---------|-----------|-------------|
| `signup_1d` | 1 day after account creation | Onboarding reminder |
| `signup_3d` | 3 days, setup < 50% | Step-specific help |
| `signup_7d` | 7 days, setup incomplete | Urgent setup prompt |
| `inactive_14d` | 14 days since last login, not active | Re-engagement |
| `inactive_30d` | 30 days since last login | At-risk notification |
| `inactive_60d` | 60 days since last login | Dormant notice |
| `missing_invoices` | Setup complete but 0 invoices in active term | Invoice generation prompt |
| `missing_students` | School created but 0 students | Student import prompt |
| `missing_fee_templates` | Students exist but 0 fee templates | Template creation prompt |
| `missing_parents` | Students exist but 0 parent links | Parent linking prompt |
| `overdue_invoices` | Any invoice overdue > 7 days | Payment reminder |
| `upcoming_term` | 14 days before new term starts | Term preparation |

---

## Notification Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ Cron        │────→│ Lifecycle        │────→│ NotificationQueue │
│ Scheduler   │     │ Evaluator        │     │ (NotificationOutbox)
└─────────────┘     └──────────────────┘     └────────┬──────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ Notification     │
                                              │ Worker           │
                                              └──────┬───────────┘
                                                      │
                                      ┌───────────────┼───────────────┐
                                      ▼               ▼               ▼
                               ┌──────────┐    ┌──────────┐    ┌──────────┐
                               │ Resend   │    │ Termii   │    │ (future) │
                               │ (Email)  │    │ (SMS)    │    │WhatsApp  │
                               └──────────┘    └──────────┘    └──────────┘
                                      │               │               │
                                      ▼               ▼               ▼
                               ┌─────────────────────────────────────────┐
                               │           AuditLog + Analytics          │
                               └─────────────────────────────────────────┘
```

### Rules

1. **Cron does NOT send email.** Cron finds eligible users and enqueues notifications.
2. **Worker sends.** A process-notification job reads the queue and sends via Resend/Termii.
3. **Retry failures.** The worker retries up to 3 times before marking as failed.
4. **Log everything.** Every send, failure, open (future), and click (future) goes to AuditLog.

---

## Data Model

### LifecycleEvent (new model)

```prisma
model LifecycleEvent {
  id                String   @id @default(cuid())
  schoolId          String
  school            School   @relation(fields: [schoolId], references: [id])
  userId            String
  milestone         String   // "account_created", "setup_completed", "first_invoice", etc.
  occurredAt        DateTime @default(now())
  metadata          Json?

  @@index([schoolId, userId])
  @@index([milestone, occurredAt])
}
```

### NotificationHistory (new or extend NotificationOutbox)

```prisma
model NotificationHistory {
  id                String    @id @default(cuid())
  schoolId          String
  userId            String?
  parentId          String?
  trigger           String    // "signup_7d", "missing_invoices", etc.
  channel           String    // "email", "sms", "whatsapp", "push"
  template          String    // "onboarding_step_3", "inactive_14d"
  recipient         String
  subject           String?
  status            String    // "queued", "sent", "delivered", "failed", "opened", "clicked"
  providerId        String?   // Resend message ID, Termii message ID
  sentAt            DateTime?
  deliveredAt       DateTime?
  openedAt          DateTime?
  clickedAt         DateTime?
  failedAt          DateTime?
  errorLog          String?
  createdAt         DateTime  @default(now())
}
```

---

## Template System

Templates are NOT hardcoded strings. Each template has:

- `id` — unique key (e.g., `onboarding_step_3`)
- `subject` — template string (supports `{{schoolName}}`, `{{fullName}}`, etc.)
- `bodyHtml` — Handlebars/MJML template
- `channels` — which channels this template supports
- `conditions` — JSON conditions for eligibility

### Template Examples

```
onboarding_step_3:
  "You're only two steps away from collecting fees online."
  → CTA: "Create Your Fee Library"

inactive_14d:
  "Your next school term can be fully prepared in under five minutes."
  → CTA: "Set Up Next Term"

missing_invoices:
  "Your students are ready. Generate their term invoices now."
  → CTA: "Generate Invoices"
```

---

## Notification Preferences

New model for user opt-in/opt-out:

```prisma
model NotificationPreference {
  id        String @id @default(cuid())
  schoolId  String
  userId    String?
  parentId  String?
  channel   String // "email", "sms", "whatsapp", "push"
  category  String // "marketing", "product_updates", "reminders"
  subscribed Boolean @default(true)
  updatedAt DateTime @updatedAt
}
```

---

## Product Integrity Rules

The engine MUST:

- Never send duplicates (check NotificationHistory before creating)
- Stop onboarding emails once setup is complete
- Stop inactive reminders once user becomes active
- Never send invoice reminders before invoices exist
- Never send before setup is started for onboarding
- Respect notification preferences and unsubscribes
- Queue through NotificationOutbox
- Write AuditLog entries for every send
- Not alter financial calculations, invoice logic, payment processing, auth, or permissions

---

## Analytics

Track per-campaign:

| Metric | Source |
|--------|--------|
| Queued | Cron count |
| Sent | Worker success |
| Delivered | Provider webhook (future) |
| Failed | Worker error |
| Opened | Tracking pixel (future) |
| Clicked | Link redirect (future) |
| Skipped | Condition evaluator |
| Unsubscribed | Preference change |

---

## Implementation Order

1. Create `LifecycleEvent` and `NotificationHistory` models + migration
2. Build lifecycle evaluator service (determines stage from events)
3. Build trigger evaluator service (finds users matching triggers)
4. Create cron endpoint that evaluates triggers and enqueues notifications
5. Create notification template registry
6. Add `NotificationPreference` model + basic UI
7. Update worker to consume from queue
8. Add analytics recording
9. Add email tracking pixels (future)
10. Add A/B testing support (future)

---

## Design Principles

- **One infrastructure, many triggers.** Don't build separate paths for onboarding vs reminders vs announcements.
- **Milestones over timeouts.** Communications should respond to user progress, not arbitrary delays.
- **Product coaching, not marketing.** Every email should feel like a helpful nudge from your onboarding manager, not a promotional blast.
- **Queue everything.** Never send directly from cron.
- **Extensibility first.** The engine must support new channels (WhatsApp, push) and new triggers without rewrites.
