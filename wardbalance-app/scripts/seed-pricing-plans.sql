-- ============================================================
-- WardBalance — Seed Pricing Plans Table
-- ============================================================
-- Populates the default pricing plans required for school subscriptions
-- ============================================================

INSERT INTO "pricing_plans" ("id", "name", "tier", "price", "currency", "billingPeriod", "features", "limits", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES 
(
  'starter_free', 
  'Starter', 
  0, 
  0.00, 
  'NGN', 
  NULL, 
  '["1 School workspace", "Up to 50 students", "1 Admin / bursar account", "Create custom fee library", "Track parent outstanding balances", "Record manual payment transactions", "Basic receipts & report summaries"]'::jsonb, 
  '{"students": 50, "workspaces": 1, "staffUsers": 1, "paymentMethods": "manual", "reports": "basic"}'::jsonb, 
  true, 
  0, 
  NOW(), 
  NOW()
),
(
  'pro_term', 
  'Pro', 
  1, 
  20.00, 
  'NGN', 
  'term', 
  '["Everything in Starter", "Up to 500 students", "Up to 5 staff user accounts", "Class fee templates", "Invoices batch generation", "Discounts & optional activities", "Debtors list & collection summaries", "Immutable audit log trail"]'::jsonb, 
  '{"students": 500, "workspaces": 1, "staffUsers": 5, "paymentMethods": "all", "reports": "advanced"}'::jsonb, 
  true, 
  1, 
  NOW(), 
  NOW()
),
(
  'group_custom', 
  'Group', 
  2, 
  0.00, 
  'NGN', 
  'custom', 
  '["Everything in Pro", "Multiple school branches", "Group-level consolidated reports", "Dedicated database workspace", "Guided bursar training & support", "Custom system integration"]'::jsonb, 
  '{"students": -1, "workspaces": -1, "staffUsers": -1, "paymentMethods": "all", "reports": "advanced"}'::jsonb, 
  true, 
  2, 
  NOW(), 
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

SELECT 'Pricing plans seeded successfully!' AS result;
