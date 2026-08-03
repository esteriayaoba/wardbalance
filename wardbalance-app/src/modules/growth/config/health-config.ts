/**
 * Configurable weights and tier boundaries for the School Health Evaluator.
 * Adjust these values to change scoring without touching business logic.
 *
 * INVARIANT: all weights must sum to exactly 1.0
 */
export const HEALTH_SIGNAL_WEIGHTS = {
  loginRecency:        0.25,
  onboardingProgress:  0.20,
  subscriptionStatus:  0.20,
  overdueInvoices:     0.15,
  featureAdoption:     0.10,
  recentActivity:      0.10,
} as const satisfies Record<string, number>;

export type HealthSignalKey = keyof typeof HEALTH_SIGNAL_WEIGHTS;

/**
 * Tier boundaries (inclusive).
 * compositeScore is 0–100.
 */
export const HEALTH_TIERS = {
  healthy:         { min: 70, label: "Healthy" },
  needs_attention: { min: 40, label: "Needs Attention" },
  at_risk:         { min: 15, label: "At Risk" },
  inactive:        { min: 0,  label: "Inactive" },
} as const;

export type HealthTier = keyof typeof HEALTH_TIERS;
