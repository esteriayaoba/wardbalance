-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'sms');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'processing', 'sent', 'failed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'card';
ALTER TYPE "PaymentMethod" ADD VALUE 'online';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "lastReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "overdueMarkedAt" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NotificationOutbox" (
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

-- CreateIndex
CREATE INDEX "NotificationOutbox_schoolId_idx" ON "NotificationOutbox"("schoolId");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_retryCount_idx" ON "NotificationOutbox"("status", "retryCount");

-- CreateIndex
CREATE INDEX "NotificationOutbox_parentId_idx" ON "NotificationOutbox"("parentId");

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
