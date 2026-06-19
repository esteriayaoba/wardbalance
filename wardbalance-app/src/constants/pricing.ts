export type PlanId = "freemium" | "business" | "multi_school";

export interface PricingPlan {
  id: PlanId;
  name: string;
  targetUser: string;
  priceDisplay: string;
  billingLabel: string;
  ctaText: string;
  ctaRoute: string;
  isPopular?: boolean;
  features: string[];
  limits: {
    students: number;
    workspaces: number;
    staffUsers: number;
    paymentMethods: "manual" | "all";
    reports: "basic" | "advanced";
  };
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "freemium",
    name: "Starter",
    targetUser: "Perfect for testing the waters and managing your first class.",
    priceDisplay: "₦0",
    billingLabel: "Free forever",
    ctaText: "Get Started Free",
    ctaRoute: "/signup?plan=freemium&source=pricing",
    features: [
      "1 School workspace",
      "Up to 50 students",
      "1 Admin / bursar account",
      "Create custom fee library",
      "Track parent outstanding balances",
      "Record manual payment transactions",
      "Basic receipts & report summaries",
    ],
    limits: {
      students: 50,
      workspaces: 1,
      staffUsers: 1,
      paymentMethods: "manual",
      reports: "basic",
    },
  },
  {
    id: "business",
    name: "Pro",
    targetUser: "For active schools needing advanced operations and staff tools.",
    priceDisplay: "₦50,000",
    billingLabel: "per term",
    ctaText: "Start Business Plan",
    ctaRoute: "/signup?plan=business&source=pricing",
    isPopular: true,
    features: [
      "Everything in Starter",
      "Up to 500 students",
      "Up to 5 staff user accounts",
      "Class fee templates",
      "Invoices batch generation",
      "Discounts & optional activities",
      "Debtors list & collection summaries",
      "Immutable audit log trail",
    ],
    limits: {
      students: 500,
      workspaces: 1,
      staffUsers: 5,
      paymentMethods: "all",
      reports: "advanced",
    },
  },
  {
    id: "multi_school",
    name: "Group",
    targetUser: "Built for multi-branch schools and educational groups.",
    priceDisplay: "Custom",
    billingLabel: "Contact sales",
    ctaText: "Book a Demo",
    ctaRoute: "#demo",
    features: [
      "Everything in Pro",
      "Multiple school branches",
      "Group-level consolidated reports",
      "Dedicated database workspace",
      "Guided bursar training & support",
      "Custom system integration",
    ],
    limits: {
      students: -1, // Unlimited / Custom
      workspaces: -1,
      staffUsers: -1,
      paymentMethods: "all",
      reports: "advanced",
    },
  },
];

// TODO: Final pricing must be confirmed before public launch.
// Subscription payment collection/billing is not active yet in this phase.
