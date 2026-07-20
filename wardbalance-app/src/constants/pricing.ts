export type PlanId = "freemium" | "business" | "multi_school";

export interface PricingPlan {
  id: PlanId;
  dbPlanId: string; // maps to PricingPlan.id in the database
  name: string;
  targetUser: string;
  priceDisplay: string;
  rawPrice: number; // in Naira, for backend calculations
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
    dbPlanId: "starter_free",
    name: "Starter",
    targetUser: "Perfect for testing the waters and managing your first class.",
    priceDisplay: "₦0",
    rawPrice: 0,
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
    dbPlanId: "pro_term",
    name: "Pro",
    targetUser: "For active schools needing advanced operations and staff tools.",
    priceDisplay: "₦20",
    rawPrice: 20,
    billingLabel: "per term (test pricing)",
    ctaText: "Start Pro Plan",
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
    dbPlanId: "group_custom",
    name: "Group",
    targetUser: "Built for multi-branch schools and educational groups.",
    priceDisplay: "Custom",
    rawPrice: 0,
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
      students: -1,
      workspaces: -1,
      staffUsers: -1,
      paymentMethods: "all",
      reports: "advanced",
    },
  },
];

// TODO: Set final pricing before public launch.
// Currently using ₦20/test pricing for the Pro plan during development.
// To change, update `rawPrice` and `priceDisplay` on the business entry above.
