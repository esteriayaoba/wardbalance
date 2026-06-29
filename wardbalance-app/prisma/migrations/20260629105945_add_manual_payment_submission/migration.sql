-- CreateEnum
CREATE TYPE "ManualPaymentSubmissionStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'ReuploadRequested', 'Cancelled');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankName" TEXT;

-- CreateTable
CREATE TABLE "ManualPaymentSubmission" (
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

-- CreateIndex
CREATE INDEX "ManualPaymentSubmission_schoolId_idx" ON "ManualPaymentSubmission"("schoolId");

-- CreateIndex
CREATE INDEX "ManualPaymentSubmission_status_idx" ON "ManualPaymentSubmission"("status");

-- AddForeignKey
ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualPaymentSubmission" ADD CONSTRAINT "ManualPaymentSubmission_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
