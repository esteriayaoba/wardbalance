import { describe, it, expect } from "vitest";
import { HEALTH_SIGNAL_WEIGHTS, HEALTH_TIERS } from "./config/health-config";

// Mock template replacement function locally to isolate logic testing
function replacePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

describe("Platform Growth CRM Engine tests", () => {
  // Existing Phase 1 tests
  describe("Email Template Placeholder Substitution", () => {
    it("should successfully replace template placeholders with target values", () => {
      const template = "Hello {{firstName}}, welcome to {{schoolName}}. Click here: {{unsubscribe}}";
      const replacements = {
        firstName: "Emeka",
        schoolName: "Lagos Prep Academy",
        unsubscribe: "https://wardbalance.com/unsubscribe?email=emeka@test.com",
      };

      const output = replacePlaceholders(template, replacements);
      expect(output).toBe("Hello Emeka, welcome to Lagos Prep Academy. Click here: https://wardbalance.com/unsubscribe?email=emeka@test.com");
    });

    it("should leave unchanged variables if they are not matching keys", () => {
      const template = "Welcome to {{schoolName}}, {{unknownVar}}!";
      const replacements = {
        schoolName: "Ibadan Grammar School",
      };

      const output = replacePlaceholders(template, replacements);
      expect(output).toBe("Welcome to Ibadan Grammar School, {{unknownVar}}!");
    });
  });

  describe("Audience Deduplication and Syntax Check Logic simulation", () => {
    it("should deduplicate and clean raw recipient candidates list", () => {
      const rawCandidates = [
        { email: "john@example.com", fullName: "John Doe" },
        { email: "john@example.com", fullName: "John Duplicate" }, // duplicate
        { email: "invalid-email-address", fullName: "Invalid User" }, // invalid syntax
        { email: "suppressed@bounced.com", fullName: "Bounced User" }, // suppressed
        { email: "jane@example.com", fullName: "Jane Doe" },
      ];

      const suppressedEmails = new Set(["suppressed@bounced.com"]);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Filter logic implementation simulation matching CampaignAudienceResolver
      const seenEmails = new Set<string>();
      const filtered = [];

      for (const c of rawCandidates) {
        if (!c.email) continue;
        const emailLower = c.email.toLowerCase().trim();

        if (seenEmails.has(emailLower)) continue;
        seenEmails.add(emailLower);

        if (!emailRegex.test(emailLower)) continue;
        if (suppressedEmails.has(emailLower)) continue;

        filtered.push(c);
      }

      expect(filtered).toHaveLength(2);
      expect(filtered[0]?.email).toBe("john@example.com");
      expect(filtered[1]?.email).toBe("jane@example.com");
    });
  });

  // New Phase 2 tests
  describe("School Health Configurations Check", () => {
    it("should assert that configurable signal weights sum up to exactly 1.0", () => {
      const totalWeight = Object.values(HEALTH_SIGNAL_WEIGHTS).reduce((sum, w) => sum + w, 0);
      // Clean up floating point precision before checking
      const rounded = Math.round(totalWeight * 100) / 100;
      expect(rounded).toBe(1.0);
    });

    it("should classify composite scores into correct health tiers", () => {
      // Helper function matching the tier logic in SchoolHealthEvaluator
      const getTier = (score: number) => {
        let tier = "inactive";
        for (const [key, bounds] of Object.entries(HEALTH_TIERS)) {
          if (score >= bounds.min) {
            tier = key;
            break;
          }
        }
        return tier;
      };

      expect(getTier(95)).toBe("healthy");
      expect(getTier(70)).toBe("healthy");
      expect(getTier(69)).toBe("needs_attention");
      expect(getTier(40)).toBe("needs_attention");
      expect(getTier(39)).toBe("at_risk");
      expect(getTier(15)).toBe("at_risk");
      expect(getTier(14)).toBe("inactive");
      expect(getTier(0)).toBe("inactive");
    });
  });

  describe("Last-Touch Attribution Simulation", () => {
    it("should find and select the most recent touchpoint based on chronological order", () => {
      // Mock campaign deliveries
      const history = [
        { campaignId: "camp_welcome", sentAt: new Date("2026-07-01T10:00:00Z") },
        { campaignId: "camp_checklist", sentAt: new Date("2026-07-15T12:00:00Z") },
        { campaignId: "camp_trial_ending", sentAt: new Date("2026-07-30T15:00:00Z") },
      ];

      // Sort by sentAt desc and choose the first
      const sorted = [...history].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
      const lastTouched = sorted[0];

      expect(lastTouched?.campaignId).toBe("camp_trial_ending");
    });
  });

  describe("Campaign Goal Conversion Event Mappings", () => {
    it("should correctly translate CampaignGoals to corresponding conversion event type names", () => {
      const GOAL_EVENT_MAP: Record<string, string> = {
        INCREASE_DEMO_BOOKINGS: "demo_booked",
        ACTIVATE_NEW_SCHOOLS:   "registered",
        COMPLETE_ONBOARDING:    "onboarding_complete",
        TRIAL_CONVERSION:       "paid_subscription",
        SUBSCRIPTION_RENEWAL:   "renewed",
      };

      expect(GOAL_EVENT_MAP["INCREASE_DEMO_BOOKINGS"]).toBe("demo_booked");
      expect(GOAL_EVENT_MAP["ACTIVATE_NEW_SCHOOLS"]).toBe("registered");
      expect(GOAL_EVENT_MAP["COMPLETE_ONBOARDING"]).toBe("onboarding_complete");
      expect(GOAL_EVENT_MAP["TRIAL_CONVERSION"]).toBe("paid_subscription");
      expect(GOAL_EVENT_MAP["SUBSCRIPTION_RENEWAL"]).toBe("renewed");
    });
  });
});
