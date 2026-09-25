-- AlterEnum
ALTER TYPE "InviteStatus" ADD VALUE 'ENDED';

-- AlterTable
ALTER TABLE "CoachClientInvite" ADD COLUMN     "subscriptionEndDate" DATE,
ADD COLUMN     "subscriptionStartDate" DATE;
