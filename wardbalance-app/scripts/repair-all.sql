-- ============================================================
-- WardBalance — Complete Production Database Repair Script
-- ============================================================
-- Uses standard PostgreSQL 9.6+ DDL (ADD COLUMN IF NOT EXISTS)
-- so it can be executed cleanly in Neon SQL Editor without
-- PL/pgSQL DO block limitations.
-- ============================================================

-- 1. Create Enums if they don't exist
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('SchoolOwner', 'Principal', 'Bursar', 'Admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PlatformRole" AS ENUM ('PlatformAdmin', 'Marketing', 'CustomerSuccess', 'Support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignGoal" AS ENUM ('INCREASE_DEMO_BOOKINGS', 'ACTIVATE_NEW_SCHOOLS', 'COMPLETE_ONBOARDING', 'TRIAL_CONVERSION', 'SUBSCRIPTION_RENEWAL', 'PRODUCT_ANNOUNCEMENT', 'NEWSLETTER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ManualPaymentSubmissionStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'ReuploadRequested', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'processing', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DiscountRuleType" AS ENUM ('fixed', 'percentage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DiscountScope" AS ENUM ('all_students', 'specific_class', 'specific_class_arm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DiscountCondition" AS ENUM ('sibling_count', 'early_payment', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'SUPPRESSED', 'SKIPPED', 'DELIVERED', 'OPENED', 'CLICKED', 'CONVERTED', 'BOUNCED', 'UNSUBSCRIBED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add Enum Values safely
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SchoolOwner';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'Principal';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'Bursar';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'Admin';

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'card';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'online';

ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'graduated';
ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'transferred';
ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'withdrawn';
ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'archived';

-- 3. Update School Table Columns
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "selectedPlan" TEXT NOT NULL DEFAULT 'freemium';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "planStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "planStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "planLimits" JSONB;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT;

-- 4. Update User Table Columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "platformRole" "PlatformRole";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastVerificationSentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationCodeHash" TEXT;

-- 5. Update Invoice Table Columns
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "lastReminderSentAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "overdueMarkedAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER NOT NULL DEFAULT 0;

-- 6. Update Lead & Payment Columns
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE "Payment" ALTER COLUMN "recordedById" DROP NOT NULL;

-- 7. Create Missing Tables IF NOT EXISTS
CREATE TABLE IF NOT EXISTS "ManualPaymentSubmission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'bank_transfer',
    "reference" TEXT NOT NULL,
    "proofFileKey" TEXT,
    "proofFileName" TEXT,
    "proofFileType" TEXT,
    "proofFileSize" INTEGER,
    "status" "ManualPaymentSubmissionStatus" NOT NULL DEFAULT 'Pending',
    "rejectionReason" TEXT,
    "reuploadReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    CONSTRAINT "ManualPaymentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "reference" TEXT,
    "errorLog" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DiscountRule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DiscountRuleType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "condition" "DiscountCondition" NOT NULL,
    "scope" "DiscountScope" NOT NULL DEFAULT 'all_students',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditionValue" TEXT,
    "feeItemId" TEXT,
    "classLevelId" TEXT,
    "classArmId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentActivityEnrolment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeItemId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentActivityEnrolment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LifecycleEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "LifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationHistory" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "trigger" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL,
    "providerId" TEXT,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "parentId" TEXT,
    "channel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pricing_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "billingPeriod" TEXT,
    "features" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "school_subscriptions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "flwCustomerId" TEXT,
    "flwCardToken" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "school_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscription_invoices" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "flwTransactionId" TEXT,
    "receiptUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "billing_transactions" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "paymentMethod" TEXT,
    "flwTransactionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "goal" "CampaignGoal" NOT NULL DEFAULT 'NEWSLETTER',
    "utmSource" TEXT NOT NULL DEFAULT 'campaign',
    "utmMedium" TEXT NOT NULL DEFAULT 'email',
    "utmCampaign" TEXT NOT NULL,
    "templateId" TEXT,
    "isParentCampaign" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "variantWeight" INTEGER NOT NULL DEFAULT 100,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "ctaUrl" TEXT,
    "footerText" TEXT,
    "audienceFilter" JSONB NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "unsubCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "campaign_version_histories" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_version_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "schoolName" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "resendId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "unsubAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),
    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "campaign_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "ctaUrl" TEXT,
    "footerText" TEXT,
    "utmSource" TEXT NOT NULL DEFAULT 'template',
    "utmMedium" TEXT NOT NULL DEFAULT 'email',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaign_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "suppression_list" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suppression_list_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "campaign_conversions" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "schoolId" TEXT,
    "leadId" TEXT,
    "eventType" TEXT NOT NULL,
    "attributionModel" TEXT NOT NULL DEFAULT 'last_touch',
    "attributedRevenue" DECIMAL(12,2),
    "metadata" JSONB,
    "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_conversions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "journeys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "journeys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "journey_steps" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "htmlBody" TEXT,
    "textBody" TEXT,
    "templateId" TEXT,
    "smsBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journey_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "journey_enrollments" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "schoolId" TEXT,
    "leadId" TEXT,
    "contactEmail" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextStepAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "exitReason" TEXT,
    CONSTRAINT "journey_enrollments_pkey" PRIMARY KEY ("id")
);

-- Done!
SELECT 'Database repair script executed successfully!' AS result;
