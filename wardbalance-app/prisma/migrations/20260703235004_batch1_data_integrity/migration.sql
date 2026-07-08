-- Batch 1: Data Integrity Fixes
-- Applied: 2026-07-03
-- 
-- 1B-1: Change AuditLog → School FK from CASCADE to RESTRICT
--       Prevents audit history being silently deleted when a school record is removed.
--
-- 1B-2: Add schoolId to ClassFeeTemplate unique constraint
--       Prevents cross-tenant unique key collisions between schools.
--
-- 1B-3: Change ManualPaymentSubmission.paymentMethod from String to PaymentMethod enum
--       Enforces valid payment methods at the DB level; removes need for type cast in service layer.

-- -------------------------------------------------------
-- 1B-1: AuditLog FK — CASCADE → RESTRICT
-- -------------------------------------------------------
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_schoolId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- -------------------------------------------------------
-- 1B-2: ClassFeeTemplate unique constraint — add schoolId
-- -------------------------------------------------------
DROP INDEX "ClassFeeTemplate_classLevelId_termId_key";
CREATE UNIQUE INDEX "ClassFeeTemplate_schoolId_classLevelId_termId_key"
  ON "ClassFeeTemplate"("schoolId", "classLevelId", "termId");

-- -------------------------------------------------------
-- 1B-3: ManualPaymentSubmission.paymentMethod — String → PaymentMethod enum
-- -------------------------------------------------------
-- First validate all existing values are valid enum members
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ManualPaymentSubmission"
    WHERE "paymentMethod" NOT IN ('cash', 'bank_transfer', 'pos', 'cheque', 'card', 'online')
  ) THEN
    RAISE EXCEPTION 'Cannot migrate paymentMethod column: found invalid enum values. Clean up data first.';
  END IF;
END $$;

-- Now alter the column type (must drop default first, then restore it)
ALTER TABLE "ManualPaymentSubmission"
  ALTER COLUMN "paymentMethod" DROP DEFAULT;

ALTER TABLE "ManualPaymentSubmission"
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod"
  USING "paymentMethod"::"PaymentMethod";

ALTER TABLE "ManualPaymentSubmission"
  ALTER COLUMN "paymentMethod" SET DEFAULT 'bank_transfer'::"PaymentMethod";
