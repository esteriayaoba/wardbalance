-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_recordedById_fkey";

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
