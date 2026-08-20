-- ============================================================
-- WardBalance — Production Database Repair Script
-- ============================================================
-- This script applies all migrations that were baselined (marked
-- as applied in _prisma_migrations) but never actually executed.
-- Run this in the Neon SQL Editor against your production database.
--
-- SAFE TO RE-RUN: Uses IF NOT EXISTS / DO $$ blocks.
-- ============================================================

-- ────────────────────────────────────────────────────────────────
-- Migration 3: 20260618151800_add_self_service_signup
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='selectedPlan') THEN
    ALTER TABLE "School" ADD COLUMN "selectedPlan" TEXT NOT NULL DEFAULT 'freemium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='planStatus') THEN
    ALTER TABLE "School" ADD COLUMN "planStatus" TEXT NOT NULL DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='planStartedAt') THEN
    ALTER TABLE "School" ADD COLUMN "planStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='trialEndsAt') THEN
    ALTER TABLE "School" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='planLimits') THEN
    ALTER TABLE "School" ADD COLUMN "planLimits" JSONB;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Migration 4: 20260619151112_add_user_email_verification
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='emailVerified') THEN
    ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='emailVerifiedAt') THEN
    ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='lastVerificationSentAt') THEN
    ALTER TABLE "User" ADD COLUMN "lastVerificationSentAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='verificationAttempts') THEN
    ALTER TABLE "User" ADD COLUMN "verificationAttempts" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='verificationCodeExpiresAt') THEN
    ALTER TABLE "User" ADD COLUMN "verificationCodeExpiresAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='verificationCodeHash') THEN
    ALTER TABLE "User" ADD COLUMN "verificationCodeHash" TEXT;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Migration 5: 20260629105945_add_manual_payment_submission
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ManualPaymentSubmissionStatus') THEN
    CREATE TYPE "ManualPaymentSubmissionStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'ReuploadRequested', 'Cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='bankAccountName') THEN
    ALTER TABLE "School" ADD COLUMN "bankAccountName" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='bankAccountNumber') THEN
    ALTER TABLE "School" ADD COLUMN "bankAccountNumber" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='School' AND column_name='bankName') THEN
    ALTER TABLE "School" ADD COLUMN "bankName" TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ManualPaymentSubmission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
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
CREATE INDEX IF NOT EXISTS "ManualPaymentSubmission_schoolId_idx" ON "ManualPaymentSubmission"("schoolId");
CREATE INDEX IF NOT EXISTS "ManualPaymentSubmission_status_idx" ON "ManualPaymentSubmission"("status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManualPaymentSubmission_schoolId_fkey') THEN
    ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManualPaymentSubmission_invoiceId_fkey') THEN
    ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManualPaymentSubmission_studentId_fkey') THEN
    ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManualPaymentSubmission_parentId_fkey') THEN
    ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Migration 6: 20260629125327_add_card_method_and_retry
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationChannel') THEN
    CREATE TYPE "NotificationChannel" AS ENUM ('email', 'sms');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationStatus') THEN
    CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'processing', 'sent', 'failed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'card' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentMethod')) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'card';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'online' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentMethod')) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'online';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Invoice' AND column_name='lastReminderSentAt') THEN
    ALTER TABLE "Invoice" ADD COLUMN "lastReminderSentAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Invoice' AND column_name='overdueMarkedAt') THEN
    ALTER TABLE "Invoice" ADD COLUMN "overdueMarkedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Invoice' AND column_name='reminderCount') THEN
    ALTER TABLE "Invoice" ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS "NotificationOutbox_schoolId_idx" ON "NotificationOutbox"("schoolId");
CREATE INDEX IF NOT EXISTS "NotificationOutbox_status_retryCount_idx" ON "NotificationOutbox"("status", "retryCount");
CREATE INDEX IF NOT EXISTS "NotificationOutbox_parentId_idx" ON "NotificationOutbox"("parentId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationOutbox_schoolId_fkey') THEN
    ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationOutbox_parentId_fkey') THEN
    ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Migration 7: 20260629125817_add_card_method_and_retry (part 2)
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_recordedById_fkey') THEN
    ALTER TABLE "Payment" DROP CONSTRAINT "Payment_recordedById_fkey";
  END IF;
END $$;

ALTER TABLE "Payment" ALTER COLUMN "recordedById" DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_recordedById_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Migration 8: 20260703041425_add_student_statuses
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscountRuleType') THEN
    CREATE TYPE "DiscountRuleType" AS ENUM ('fixed', 'percentage');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscountScope') THEN
    CREATE TYPE "DiscountScope" AS ENUM ('all_students', 'specific_class', 'specific_class_arm');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DiscountCondition') THEN
    CREATE TYPE "DiscountCondition" AS ENUM ('sibling_count', 'early_payment', 'manual');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'graduated' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StudentStatus')) THEN
    ALTER TYPE "StudentStatus" ADD VALUE 'graduated';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'transferred' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StudentStatus')) THEN
    ALTER TYPE "StudentStatus" ADD VALUE 'transferred';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'suspended' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StudentStatus')) THEN
    ALTER TYPE "StudentStatus" ADD VALUE 'suspended';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'withdrawn' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StudentStatus')) THEN
    ALTER TYPE "StudentStatus" ADD VALUE 'withdrawn';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'archived' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StudentStatus')) THEN
    ALTER TYPE "StudentStatus" ADD VALUE 'archived';
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS "DiscountRule_schoolId_idx" ON "DiscountRule"("schoolId");

CREATE TABLE IF NOT EXISTS "StudentActivityEnrolment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeItemId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentActivityEnrolment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StudentActivityEnrolment_schoolId_idx" ON "StudentActivityEnrolment"("schoolId");
CREATE INDEX IF NOT EXISTS "StudentActivityEnrolment_studentId_idx" ON "StudentActivityEnrolment"("studentId");
CREATE INDEX IF NOT EXISTS "StudentActivityEnrolment_feeItemId_idx" ON "StudentActivityEnrolment"("feeItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentActivityEnrolment_studentId_feeItemId_sessionId_key" ON "StudentActivityEnrolment"("studentId", "feeItemId", "sessionId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiscountRule_schoolId_fkey') THEN
    ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentActivityEnrolment_schoolId_fkey') THEN
    ALTER TABLE "StudentActivityEnrolment" ADD CONSTRAINT "StudentActivityEnrolment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentActivityEnrolment_studentId_fkey') THEN
    ALTER TABLE "StudentActivityEnrolment" ADD CONSTRAINT "StudentActivityEnrolment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentActivityEnrolment_feeItemId_fkey') THEN
    ALTER TABLE "StudentActivityEnrolment" ADD CONSTRAINT "StudentActivityEnrolment_feeItemId_fkey" FOREIGN KEY ("feeItemId") REFERENCES "FeeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentActivityEnrolment_sessionId_fkey') THEN
    ALTER TABLE "StudentActivityEnrolment" ADD CONSTRAINT "StudentActivityEnrolment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Migration 10: 20260703235004_batch1_data_integrity
-- ────────────────────────────────────────────────────────────────
-- 1B-1: AuditLog FK — CASCADE → RESTRICT
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_schoolId_fkey') THEN
    ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_schoolId_fkey";
  END IF;
END $$;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 1B-2: ClassFeeTemplate unique constraint — add schoolId
DROP INDEX IF EXISTS "ClassFeeTemplate_classLevelId_termId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ClassFeeTemplate_schoolId_classLevelId_termId_key"
  ON "ClassFeeTemplate"("schoolId", "classLevelId", "termId");

-- 1B-3: ManualPaymentSubmission.paymentMethod — String → PaymentMethod enum
-- Only run if column is still text type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ManualPaymentSubmission'
    AND column_name = 'paymentMethod'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "ManualPaymentSubmission" ALTER COLUMN "paymentMethod" DROP DEFAULT;
    ALTER TABLE "ManualPaymentSubmission" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::"PaymentMethod";
    ALTER TABLE "ManualPaymentSubmission" ALTER COLUMN "paymentMethod" SET DEFAULT 'bank_transfer'::"PaymentMethod";
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Migration 11: 20260708132717_add_parent_ward_link_school_relation
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ParentWardLink_schoolId_fkey') THEN
    ALTER TABLE "ParentWardLink" ADD CONSTRAINT "ParentWardLink_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Migration 12: 20260720144530_add_subscription_billing_models
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LifecycleEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "LifecycleEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LifecycleEvent_schoolId_userId_idx" ON "LifecycleEvent"("schoolId", "userId");
CREATE INDEX IF NOT EXISTS "LifecycleEvent_milestone_occurredAt_idx" ON "LifecycleEvent"("milestone", "occurredAt");

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
CREATE INDEX IF NOT EXISTS "NotificationHistory_schoolId_idx" ON "NotificationHistory"("schoolId");
CREATE INDEX IF NOT EXISTS "NotificationHistory_trigger_status_idx" ON "NotificationHistory"("trigger", "status");
CREATE INDEX IF NOT EXISTS "NotificationHistory_schoolId_userId_trigger_idx" ON "NotificationHistory"("schoolId", "userId", "trigger");

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
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_schoolId_idx" ON "PushSubscription"("schoolId");
CREATE INDEX IF NOT EXISTS "PushSubscription_parentId_idx" ON "PushSubscription"("parentId");

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
CREATE INDEX IF NOT EXISTS "NotificationPreference_schoolId_idx" ON "NotificationPreference"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_schoolId_userId_parentId_channel_cat_key" ON "NotificationPreference"("schoolId", "userId", "parentId", "channel", "category");

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
CREATE UNIQUE INDEX IF NOT EXISTS "school_subscriptions_schoolId_key" ON "school_subscriptions"("schoolId");
CREATE INDEX IF NOT EXISTS "school_subscriptions_status_idx" ON "school_subscriptions"("status");
CREATE INDEX IF NOT EXISTS "school_subscriptions_planId_idx" ON "school_subscriptions"("planId");

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
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_invoices_invoiceNumber_key" ON "subscription_invoices"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "subscription_invoices_subscriptionId_idx" ON "subscription_invoices"("subscriptionId");
CREATE INDEX IF NOT EXISTS "subscription_invoices_schoolId_idx" ON "subscription_invoices"("schoolId");
CREATE INDEX IF NOT EXISTS "subscription_invoices_status_idx" ON "subscription_invoices"("status");
CREATE INDEX IF NOT EXISTS "subscription_invoices_invoiceNumber_idx" ON "subscription_invoices"("invoiceNumber");

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
CREATE UNIQUE INDEX IF NOT EXISTS "billing_transactions_flwTransactionId_key" ON "billing_transactions"("flwTransactionId");
CREATE INDEX IF NOT EXISTS "billing_transactions_invoiceId_idx" ON "billing_transactions"("invoiceId");
CREATE INDEX IF NOT EXISTS "billing_transactions_flwTransactionId_idx" ON "billing_transactions"("flwTransactionId");
CREATE INDEX IF NOT EXISTS "billing_transactions_schoolId_idx" ON "billing_transactions"("schoolId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManualPaymentSubmission_reviewedById_fkey') THEN
    ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LifecycleEvent_schoolId_fkey') THEN
    ALTER TABLE "LifecycleEvent" ADD CONSTRAINT "LifecycleEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationHistory_schoolId_fkey') THEN
    ALTER TABLE "NotificationHistory" ADD CONSTRAINT "NotificationHistory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_schoolId_fkey') THEN
    ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationPreference_schoolId_fkey') THEN
    ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_subscriptions_schoolId_fkey') THEN
    ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_subscriptions_planId_fkey') THEN
    ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_invoices_subscriptionId_fkey') THEN
    ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "school_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_invoices_schoolId_fkey') THEN
    ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_transactions_invoiceId_fkey') THEN
    ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "subscription_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_transactions_subscriptionId_fkey') THEN
    ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "school_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_transactions_schoolId_fkey') THEN
    ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Migration 13: 20260729120148_add_campaign_engine
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CampaignStatus') THEN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryStatus') THEN
    CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'CONVERTED', 'BOUNCED', 'FAILED', 'UNSUBSCRIBED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
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
CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX IF NOT EXISTS "campaigns_scheduledAt_idx" ON "campaigns"("scheduledAt");

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
    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_recipients_resendId_key" ON "campaign_recipients"("resendId");
CREATE INDEX IF NOT EXISTS "campaign_recipients_status_idx" ON "campaign_recipients"("status");
CREATE INDEX IF NOT EXISTS "campaign_recipients_resendId_idx" ON "campaign_recipients"("resendId");
CREATE INDEX IF NOT EXISTS "campaign_recipients_nextAttemptAt_idx" ON "campaign_recipients"("nextAttemptAt");
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_recipients_campaignId_email_key" ON "campaign_recipients"("campaignId", "email");

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
CREATE UNIQUE INDEX IF NOT EXISTS "suppression_list_email_key" ON "suppression_list"("email");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_templateId_fkey') THEN
    ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "campaign_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_parentId_fkey') THEN
    ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_createdById_fkey') THEN
    ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_approvedById_fkey') THEN
    ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_version_histories_campaignId_fkey') THEN
    ALTER TABLE "campaign_version_histories" ADD CONSTRAINT "campaign_version_histories_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_version_histories_updatedById_fkey') THEN
    ALTER TABLE "campaign_version_histories" ADD CONSTRAINT "campaign_version_histories_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_recipients_campaignId_fkey') THEN
    ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- DONE! All baselined migrations have been applied.
-- ============================================================
SELECT 'SUCCESS: All missing columns, tables, and constraints have been applied.' AS result;
