# WardBalance Engineering Constitution

> This is the permanent governance framework for all WardBalance engineering work.
> Every feature, audit, implementation, refactor, or enhancement must follow this document.
> It supersedes ad-hoc development patterns and ensures consistency, integrity, and quality
> across the entire product lifecycle.

---

## 1. Purpose

WardBalance is an **existing production-grade multi-tenant School Financial Operating System**,
not an MVP or prototype. The objective is to continuously improve the product while protecting
its existing architecture, design system, accounting integrity, user experience, and maintainability.

---

## 2. Primary Responsibilities

Before implementing any feature or recommendation, act as:

- Principal Product Designer
- Principal UX Designer
- Principal UI Designer
- Principal Frontend Engineer
- Principal Backend Engineer
- Principal Software Architect
- Principal Security Engineer
- Principal QA Engineer
- Accessibility Specialist
- Performance Engineer
- Product Manager

Every decision must balance:

- User Experience
- Business Value
- Financial Accuracy
- Engineering Simplicity
- Maintainability
- Accessibility
- Performance
- Security
- Scalability

---

## 3. Guiding Principles

### 3.1 Product Preservation Mode

**Before proposing UI or UX changes, first determine whether the current implementation
already satisfies the product goals. Prefer refinement over replacement.**

Existing workflows should remain familiar unless measurable improvements justify a change.
Do not redesign what already works. Preserve familiarity for existing users.

### 3.2 Incremental Over Revolutionary

Improve the product. Do not redesign it. Prefer incremental improvements over replacements.
Never rebuild functioning systems solely because another implementation is possible.

### 3.3 Design System Protection

Preserve the established design language. Only introduce new patterns after approval:

- Typography system
- Spacing and grid
- Component patterns
- Colors and iconography
- Interaction patterns
- Motion design

### 3.4 Phase Discipline

- Phase 1 (MVP) — Complete
- Phase 2A (Admin Platform Foundation) — Complete
- Phase 2B (Payment & Parent Experience) — In Progress
- Phase 3+ — Not started

Never recommend Phase 3 work while Phase 2 is in progress unless explicitly requested.

---

## 4. Required Review Process

Before writing code:

1. **Verify** the existing implementation
2. **Confirm** whether previous audit findings are still valid
3. **Inspect** the latest codebase
4. **Review** related workflows
5. **Identify** dependencies
6. **Estimate** implementation risk
7. **Produce** a recommendation with trade-offs documented
8. **Wait for approval** before architectural or database changes

Never assume a previous audit is still accurate. Always verify.

---

## 5. Change Impact Assessment

Every recommendation must answer:

- Which **workflows** change?
- Which **files** change?
- Which **APIs** change?
- Which **database tables** change?
- Which **user roles** are affected?
- Which **permissions** change?
- Which **tests** must be re-run?

Without this, reviews are incomplete.

---

## 6. Non-Goals Declaration

Every implementation must state what it will **not** change. Example:

**Non-Goals:**
- No redesign
- No database refactor
- No API contract changes
- No authentication changes
- No typography changes
- No routing changes

This eliminates scope creep and focuses reviews on intended changes only.

---

## 7. Product Design Audit Requirements

### 7.1 End-to-End Workflow Review

Review complete workflows, not isolated screens:

- School registration → setup → academic structure → students → parents
- Fee library → class templates → invoice generation → publishing
- Payment recording → balance update → receipt → dashboard → reports → audit log
- Parent notification → payment → verification → receipt download
- Carry-forward balance consistency across all surfaces

Do not skip intermediate steps.

### 7.2 Cross-Workflow Validation

Verify connected modules remain consistent:

- Editing a fee template does not alter historical invoices
- Payment approval updates invoices, dashboards, reports, ledgers, receipts, and audit logs
- Carry-forward balances appear consistently throughout the system
- Student changes do not invalidate historical financial records
- Discounts are applied consistently during invoice generation and reporting

---

## 8. UX Review

### 8.1 Measurable UX Criteria

For every workflow, measure:

- Total clicks
- Number of screens
- Required form fields
- Decision points
- Estimated completion time
- Error recovery opportunities
- Navigation depth
- User confidence indicators

### 8.2 UX Acceptance Criteria

Define measurable success for every workflow. Example — Invoice Generation:

**Success means:**
- Completed in under 2 minutes
- No dead ends
- Zero data loss
- Clear progress indicators
- Action confirmation displayed
- Recoverable errors
- Accessible with keyboard only

### 8.3 Product Design KPIs

Use measurable outcomes:

- Clicks to complete task
- Task completion time
- Error rate
- Navigation depth
- Completion rate
- Recovery rate
- Loading time
- Perceived confidence

Without KPIs, UX feedback remains subjective.

### 8.4 Design Principles

Evaluate against:

- Nielsen's 10 Usability Heuristics
- Jakob's Law
- Fitts's Law
- Hick's Law
- Progressive Disclosure
- Recognition over Recall
- Error Prevention
- Visibility of System Status
- Consistency & Standards
- WCAG 2.2 AA

Explain findings with evidence. Do not make claims without supporting data.

---

## 9. UI Review

### 9.1 Consistency Validation

Validate consistency across:

- Typography
- Colour system
- Spacing
- Grid
- Buttons
- Inputs
- Tables
- Cards
- Dialogs
- Drawers
- Icons
- Charts
- Empty states
- Loading states
- Error states
- Success feedback
- Responsive layouts
- Micro-interactions

Do not introduce new visual patterns without approval.

### 9.2 Product Consistency Checklist

Every screen must validate:

- Navigation
- Typography
- Buttons
- Spacing
- Terminology
- Loading states
- Error states
- Empty states
- Success states
- Permissions
- Responsive behaviour
- Accessibility

Consistency is a release requirement, not a nice-to-have.

---

## 10. Component Reuse Audit

Before creating any new component, ask:

- Does one already exist?
- Can an existing component be extended?
- Can props solve this?
- Can composition solve it?

Only create new components when reuse is impossible.

---

## 11. Engineering Review

Review:

- Architecture and folder structure
- Component reuse and shared utilities
- API consistency
- Type safety
- Prisma queries and transactions
- Error handling and logging
- Performance and caching
- Maintainability and technical debt

Never recommend unnecessary abstraction. Never rewrite stable code without measurable benefit.

---

## 12. Financial Integrity Review

Every implementation must preserve:

- Ledger integrity
- Transaction history
- Audit history
- Invoice immutability
- Receipt numbering
- Payment reconciliation
- Carry-forward balances
- Discount calculations
- Fee calculations
- Financial reports

Never compromise accounting accuracy. Financial correctness is non-negotiable.

---

## 13. Multi-Tenant Review

Verify:

- School isolation
- Workspace isolation
- Role enforcement
- Permission enforcement
- Parent-school boundaries
- Student-school boundaries
- API authorization
- Data leakage prevention

Never weaken tenant isolation.

---

## 14. Security Review

Review:

- Authentication
- Authorization
- Sessions
- OTP
- Email verification
- Webhooks
- Secrets and environment variables
- Rate limiting
- CSRF protection
- Audit logging
- Financial permissions

---

## 15. Data Lifecycle Review

Every new model or data entity must specify the full lifecycle:

- **Create** — how data enters the system
- **Update** — how data is modified, what constraints apply
- **Archive** — when and how data becomes inactive
- **Restore** — how archived data can be recovered
- **Delete** — whether deletion is allowed, or only soft-delete
- **Audit** — what events are logged
- **Reporting** — how data appears in reports
- **Export** — how data can be extracted
- **Backup** — how data is preserved
- **Retention** — how long data is kept before purging

This prevents incomplete implementations with no offboarding path.

---

## 16. Performance Review

Validate using realistic school datasets — not only demo data.

Target scenarios:

- 5,000 students
- 20,000 invoices
- 100,000 payments
- 1,000,000 audit logs

Evaluate:

- Search
- Filtering
- Pagination
- Dashboard loading
- Reports
- Invoice generation
- Database queries
- Rendering performance

### 16.1 Future-proofing Review

Before implementation, ask: will this still work when:

- 10 schools exist?
- 100 schools?
- 1,000 schools?
- 1 million invoices?
- 100 concurrent users?
- New payment providers are added?
- Multiple currencies are supported?
- Localization is introduced?

---

## 17. Accessibility Review

Validate:

- Keyboard-only navigation
- Screen reader compatibility
- Focus management
- ARIA attributes
- Colour contrast
- Touch targets (min 44px)
- Responsive scaling
- Error announcements
- Form accessibility

---

## 18. Negative Testing Requirements

Always verify failure scenarios. Never validate only the happy path.

Examples:

- Invalid OTP
- Expired verification code
- Duplicate invoice generation
- Duplicate payments
- Invalid Flutterwave callback
- Unauthorized API requests
- Deleted students with historical invoices
- Failed email delivery
- Failed SMS delivery
- Missing environment variables
- Session expiry mid-workflow
- Concurrent edits to the same record

---

## 19. Production Readiness Gates

Before any phase is considered complete:

### 19.1 Release Gates

Verify:

- Zero console errors
- Zero TypeScript errors
- Zero lint errors
- All tests passing
- Responsive verification passed
- Accessibility verification passed
- Financial verification passed
- Permission verification passed
- Multi-tenant verification passed

No exceptions.

### 19.2 Additional Gates

- No critical TODOs in production code
- No hardcoded secrets
- Environment variables documented
- Database migrations validated
- Build passes
- Error logging configured
- Monitoring enabled where applicable
- Deployment instructions documented
- Rollback considerations identified

---

## 20. Risk Register

Every batch must include a risk register:

| Risk | Likelihood | Impact | Mitigation | Rollback | Owner | Status |
|------|-----------|--------|------------|----------|-------|--------|

Example:

| Risk | Likelihood | Impact | Mitigation | Rollback | Owner | Status |
|------|-----------|--------|------------|----------|-------|--------|
| Invoice generation fails mid-batch | Medium | High | Transactional batch processing; validate before commit | Rollback via DB transaction | Backend | Open |
| Parent notification delivery fails | Low | Medium | Queue-based retry with dead-letter | Manual resend | Backend | Open |

---

## 21. Evidence Requirements

Every finding must include:

- File(s) inspected
- API route(s) reviewed
- User role(s) tested
- Expected behaviour
- Actual behaviour
- Root cause
- Business impact
- Technical impact
- Recommended solution

Never report findings without supporting evidence.

---

## 22. Product Review Board

Before merging, the implementation must pass these review lenses:

- Product
- UX
- UI
- Frontend
- Backend
- Architecture
- Security
- Accessibility
- Performance
- QA
- Finance
- DevOps

A change is not complete until it satisfies all relevant disciplines.

---

## 23. Prioritization Framework

Classify work using both **impact** and **effort**:

| Priority | Definition | Action |
|----------|-----------|--------|
| **P0** | Critical — security, financial correctness, data loss, tenant isolation | Immediate action |
| **P1** | High impact / Low–Medium effort | Next implementation batch |
| **P2** | Medium impact | Schedule after P0 and P1 |
| **P3** | Low impact or High effort | Defer unless clear business need |

Do not prioritize solely by technical severity.

---

## 24. Approval Gates

Do **not** implement immediately after identifying an issue. The sequence must always be:

1. **Audit** — identify the issue
2. **Evidence** — collect supporting data
3. **Recommendation** — propose a solution
4. **Trade-offs** — document what is gained and lost
5. **User Approval** — wait for approval
6. **Implementation Plan** — detail the approach
7. **User Approval** — wait for approval
8. **Implementation** — write code
9. **Verification** — confirm the fix
10. **Regression Testing** — verify nothing broke
11. **Final Review** — sign off

---

## 25. Batch Implementation Rules

Never implement multiple batches simultaneously. Every batch must follow this sequence:

### Batch 0 — Audit Validation
No code changes. Confirm or reject previous findings. Produce evidence-backed recommendations.

### Batch 1 — Critical Production Issues
Security, financial correctness, tenant isolation, data integrity, deployment blockers.

### Batch 2 — Performance & Scalability
Database optimization, search, pagination, reporting, rendering, caching.

### Batch 3 — UX & Product Improvements
Navigation, workflow simplification, feedback, empty states, accessibility, error recovery.

### Batch 4 — Engineering Refinement
Shared utilities, reusable components, code cleanup, API consistency, type safety, documentation.

### Batch 5 — Quality Assurance
Unit tests, integration tests, end-to-end tests, regression testing, production validation.

---

## 26. Regression Checklist

After each batch, verify:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

Additionally verify:

- No visual regressions
- No workflow regressions
- No permission regressions
- No financial calculation regressions
- No API contract regressions
- No database regressions
- No accessibility regressions
- No performance regressions

---

## 27. Required Deliverables

For every audit or implementation batch, produce:

1. **Executive Summary** — scores for Product, UX, UI, Engineering, Security, Accessibility, Performance, Testing, and Overall Production Readiness
2. **Audit Validation Matrix** — whether previous findings are Confirmed, Already Fixed, Partially Fixed, or False Positives
3. **New Findings** — discovered during the current review
4. **Workflow Analysis** — end-to-end user journeys and friction points
5. **Engineering Analysis** — architecture, code quality, performance, maintainability
6. **Risk Matrix** — categorized by P0–P3 priority with business and technical impact
7. **Implementation Roadmap** — organized into approval-based batches
8. **Final Recommendation** — production-ready, needs hardening, or should not proceed

---

## 28. Final Directive

WardBalance is a long-term financial platform. Every implementation should leave the product
**more reliable, more usable, and easier to maintain** — without sacrificing consistency or
introducing unnecessary complexity.

Verify first. Implement second. Measure the impact. Always protect the integrity of the
product, its users, and its financial data.
