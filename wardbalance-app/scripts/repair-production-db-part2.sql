-- ============================================================
-- WardBalance — Production Database Repair Script (Part 2)
-- ============================================================
-- Adds columns, enums, and tables present in schema.prisma
-- but missing from the production database (never migrated).
-- Run this in the Neon SQL Editor AFTER repair-production-db.sql.
-- SAFE TO RE-RUN: Uses IF NOT EXISTS checks.
-- ============================================================

-- ────────────────────────────────────────────────────────────────
-- New enum: PlatformRole
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformRole') THEN
    CREATE TYPE "PlatformRole" AS ENUM ('PlatformAdmin', 'Marketing', 'CustomerSuccess', 'Support');
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- New enum: CampaignGoal
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CampaignGoal') THEN
    CREATE TYPE "CampaignGoal" AS ENUM ('INCREASE_DEMO_BOOKINGS', 'ACTIVATE_NEW_SCHOOLS', 'COMPLETE_ONBOARDING', 'TRIAL_CONVERSION', 'SUBSCRIPTION_RENEWAL', 'PRODUCT_ANNOUNCEMENT', 'NEWSLETTER');
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- User: Add isPlatformAdmin and platformRole columns
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='isPlatformAdmin') THEN
    ALTER TABLE "User" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='platformRole') THEN
    ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole";
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Lead: Add schoolId column and relation
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Lead' AND column_name='schoolId') THEN
    ALTER TABLE "Lead" ADD COLUMN "schoolId" TEXT;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_schoolId_key" ON "Lead"("schoolId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_schoolId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- DeliveryStatus enum: Add missing values
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PROCESSING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeliveryStatus')) THEN
    ALTER TYPE "DeliveryStatus" ADD VALUE 'PROCESSING';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUPPRESSED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeliveryStatus')) THEN
    ALTER TYPE "DeliveryStatus" ADD VALUE 'SUPPRESSED';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SKIPPED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DeliveryStatus')) THEN
    ALTER TYPE "DeliveryStatus" ADD VALUE 'SKIPPED';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- CampaignRecipient: Add complainedAt column
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaign_recipients' AND column_name='complainedAt') THEN
    ALTER TABLE "campaign_recipients" ADD COLUMN "complainedAt" TIMESTAMP(3);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Campaign: Add goal column
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='goal') THEN
    ALTER TABLE "campaigns" ADD COLUMN "goal" "CampaignGoal" NOT NULL DEFAULT 'NEWSLETTER';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- CampaignConversion table
-- ────────────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS "campaign_conversions_campaignId_idx" ON "campaign_conversions"("campaignId");
CREATE INDEX IF NOT EXISTS "campaign_conversions_schoolId_idx" ON "campaign_conversions"("schoolId");
CREATE INDEX IF NOT EXISTS "campaign_conversions_leadId_idx" ON "campaign_conversions"("leadId");
CREATE INDEX IF NOT EXISTS "campaign_conversions_eventType_idx" ON "campaign_conversions"("eventType");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_conversions_campaignId_fkey') THEN
    ALTER TABLE "campaign_conversions" ADD CONSTRAINT "campaign_conversions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_conversions_schoolId_fkey') THEN
    ALTER TABLE "campaign_conversions" ADD CONSTRAINT "campaign_conversions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_conversions_leadId_fkey') THEN
    ALTER TABLE "campaign_conversions" ADD CONSTRAINT "campaign_conversions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- Journey table
-- ────────────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS "journeys_trigger_idx" ON "journeys"("trigger");
CREATE INDEX IF NOT EXISTS "journeys_isActive_idx" ON "journeys"("isActive");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journeys_createdById_fkey') THEN
    ALTER TABLE "journeys" ADD CONSTRAINT "journeys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- JourneyStep table
-- ────────────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS "journey_steps_journeyId_stepOrder_idx" ON "journey_steps"("journeyId", "stepOrder");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journey_steps_journeyId_fkey') THEN
    ALTER TABLE "journey_steps" ADD CONSTRAINT "journey_steps_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- JourneyEnrollment table
-- ────────────────────────────────────────────────────────────────
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
CREATE UNIQUE INDEX IF NOT EXISTS "journey_enrollments_journeyId_contactEmail_key" ON "journey_enrollments"("journeyId", "contactEmail");
CREATE INDEX IF NOT EXISTS "journey_enrollments_journeyId_idx" ON "journey_enrollments"("journeyId");
CREATE INDEX IF NOT EXISTS "journey_enrollments_status_idx" ON "journey_enrollments"("status");
CREATE INDEX IF NOT EXISTS "journey_enrollments_nextStepAt_idx" ON "journey_enrollments"("nextStepAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journey_enrollments_journeyId_fkey') THEN
    ALTER TABLE "journey_enrollments" ADD CONSTRAINT "journey_enrollments_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journey_enrollments_schoolId_fkey') THEN
    ALTER TABLE "journey_enrollments" ADD CONSTRAINT "journey_enrollments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journey_enrollments_leadId_fkey') THEN
    ALTER TABLE "journey_enrollments" ADD CONSTRAINT "journey_enrollments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- DONE! All schema gaps have been filled.
-- ============================================================
SELECT 'SUCCESS: Part 2 repair complete — isPlatformAdmin, platformRole, CampaignGoal, Journey tables, and all missing schema elements applied.' AS result;
