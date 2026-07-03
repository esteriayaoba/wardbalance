-- CreateEnum
CREATE TYPE "DiscountRuleType" AS ENUM ('fixed', 'percentage');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('all_students', 'specific_class', 'specific_class_arm');

-- CreateEnum
CREATE TYPE "DiscountCondition" AS ENUM ('sibling_count', 'early_payment', 'manual');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StudentStatus" ADD VALUE 'graduated';
ALTER TYPE "StudentStatus" ADD VALUE 'transferred';
ALTER TYPE "StudentStatus" ADD VALUE 'suspended';
ALTER TYPE "StudentStatus" ADD VALUE 'withdrawn';
ALTER TYPE "StudentStatus" ADD VALUE 'archived';

-- CreateTable
CREATE TABLE "DiscountRule" (
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

-- CreateTable
CREATE TABLE "StudentActivityEnrolment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeItemId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentActivityEnrolment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscountRule_schoolId_idx" ON "DiscountRule"("schoolId");

-- CreateIndex
CREATE INDEX "StudentActivityEnrolment_schoolId_idx" ON "StudentActivityEnrolment"("schoolId");

-- CreateIndex
CREATE INDEX "StudentActivityEnrolment_studentId_idx" ON "StudentActivityEnrolment"("studentId");

-- CreateIndex
CREATE INDEX "StudentActivityEnrolment_feeItemId_idx" ON "StudentActivityEnrolment"("feeItemId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentActivityEnrolment_studentId_feeItemId_sessionId_key" ON "StudentActivityEnrolment"("studentId", "feeItemId", "sessionId");

-- AddForeignKey
ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentActivityEnrolment" ADD CONSTRAINT "StudentActivityEnrolment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentActivityEnrolment" ADD CONSTRAINT "StudentActivityEnrolment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentActivityEnrolment" ADD CONSTRAINT "StudentActivityEnrolment_feeItemId_fkey" FOREIGN KEY ("feeItemId") REFERENCES "FeeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentActivityEnrolment" ADD CONSTRAINT "StudentActivityEnrolment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
