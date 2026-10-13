-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "amountInr" INTEGER,
ADD COLUMN     "clientReportedPaidAt" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentDueReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "paymentOverdueReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "paymentReference" TEXT;

-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN     "upiId" TEXT;

