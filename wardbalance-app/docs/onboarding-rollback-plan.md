# Onboarding Launch — Rollback Plan

**Version:** 1.0  
**Author:** Engineering  
**Phase:** 2B Onboarding Overhaul  
**Last Updated:** 2026-07-20

---

## 1. Rollback Trigger Criteria

Initiate a rollback if **any one** of these thresholds is breached within the first **72 hours** of production release:

| Metric | Rollback Threshold | Measurement Source |
|--------|--------------------|--------------------|
| Onboarding completion rate | Drops >15% vs pre-release 7-day baseline | PostHog — `signup_completed → setup_completed` funnel |
| Signup error rate | Exceeds 5% of all signup submissions | PostHog — `signup_failed` event count / `signup_submitted` count |
| Signup step abandonment | Step 1 → Step 3 conversion drops >20% | PostHog — `signup_step_completed` step 1 and 3 |
| Setup wizard crash rate | Any unhandled error in `phase-wizard.tsx` or `phase-celebration.tsx` hitting Sentry | Sentry — new error groups in onboarding components |
| API error rate on `/api/signup/school` | 5xx errors exceed 2% of requests | Vercel function logs / Sentry |
| OTP failure rate (parent portal) | Failed OTP verifications exceed 20% of attempts | PostHog — `parent_otp_send_failed` / `parent_otp_submitted` |

> **Decision authority:** Any one of (Engineering Lead, Product Owner) can unilaterally trigger a rollback at any time if a threshold is breached. No committee required.

---

## 2. Feature Flag Strategy

### 2.1 Current State

No feature flag library is currently in the stack. PostHog's feature flags are available through the existing PostHog integration.

### 2.2 Flags to Enable Before Launch

Create the following flags in PostHog before deploying to production:

| Flag Key | Type | Default | Purpose |
|----------|------|---------|---------|
| `onboarding_v2_signup` | Boolean | `false` | Gates the new multi-step signup flow |
| `onboarding_v2_setup_wizard` | Boolean | `false` | Gates the phase-wizard and celebration components |
| `onboarding_v2_dashboard_preview` | Boolean | `false` | Gates step-4 dashboard preview in signup |
| `parent_otp_auth` | Boolean | `false` | Gates OTP-based parent portal authentication |

### 2.3 Rollout Strategy

```
Day 1:  Enable for internal test users only (PostHog cohort: "WardBalance Team")
Day 2:  Enable for 10% of new signups via PostHog percentage rollout
Day 3:  If no threshold breaches — expand to 50%
Day 4:  If no threshold breaches — full rollout (100%)
```

### 2.4 Implementation

Add flag checks in `signup/page.tsx` and `admin/setup/page.tsx`:

```typescript
import { useFeatureFlagEnabled } from 'posthog-js/react';

// In SignupContent component:
const useNewSignup = useFeatureFlagEnabled('onboarding_v2_signup');

// Conditionally render new vs legacy:
if (!useNewSignup) {
  return <LegacySignupFlow />;
}
```

> **Note:** The legacy signup flow must be preserved in the codebase (not deleted) until rollout reaches 100% and has been stable for 14 days.

---

## 3. Rollback Procedures

### 3.1 Immediate Rollback (< 5 minutes)

**Via PostHog Feature Flags (preferred):**

1. Log into PostHog → Feature Flags
2. Set `onboarding_v2_signup` → `false` (100% rollout to false)
3. Set `onboarding_v2_setup_wizard` → `false`
4. Set `parent_otp_auth` → `false`
5. No deployment required — takes effect within 30 seconds

**Via Vercel (if flags are not implemented yet):**

1. Go to Vercel → wardbalance → Deployments
2. Find the last stable deployment (prior to the onboarding overhaul commit)
3. Click **"Promote to Production"**
4. Confirm — Vercel promotes the old build without a new deploy

### 3.2 Git Rollback (if Vercel promotion is unavailable)

```bash
# Identify the last stable commit before the overhaul
git log --oneline

# Revert to that commit
git revert HEAD~N  # N = number of commits to revert

# Or hard reset (only if no other changes need preserving)
git checkout <last-stable-commit-hash> -- src/app/signup/page.tsx
git checkout <last-stable-commit-hash> -- src/app/admin/setup/page.tsx
git checkout <last-stable-commit-hash> -- src/components/admin/setup/
git commit -m "rollback: revert onboarding overhaul to stable baseline"
git push origin main
```

---

## 4. Monitoring During Launch Window

### 4.1 First 24 Hours — Active Watch

Monitor the following dashboards continuously during business hours (08:00–18:00 WAT):

| Dashboard | What to Watch |
|-----------|---------------|
| PostHog — Onboarding Funnel | Step-level conversion vs baseline |
| Sentry — New Issues | Any new error groups in `signup`, `setup`, `invite` pages |
| Vercel — Function Logs | `/api/signup/school` 5xx rate |
| Neon — DB | Connection pool saturation (should stay <80%) |

### 4.2 Alerts to Configure

Set up PostHog Alerts before launch:

- `signup_failed` event count > 10 in any 1-hour window → Slack notification
- `setup_completed` event count drops 0 for >2 hours during business hours → Slack notification
- `parent_otp_send_failed` event count > 5 in any 30-minute window → Slack notification

---

## 5. Post-Rollback Actions

If a rollback is executed:

1. **Within 1 hour:** Document the exact trigger (which threshold, which metric, timestamp)
2. **Within 4 hours:** Post-mortem in Slack with root cause hypothesis
3. **Within 24 hours:** Fix identified in development branch
4. **Before re-deploy:** Re-run the Batch 5 Re-Audit against the fix
5. **Re-launch:** Follow the phased rollout strategy from 2.3 again, do not skip to full rollout

---

## 6. Contacts

| Role | Responsibility |
|------|---------------|
| Engineering Lead | Authorise and execute rollback |
| Product Owner | Decide rollback threshold breach severity |
| On-call (Vercel) | Promote previous deployment if needed |
