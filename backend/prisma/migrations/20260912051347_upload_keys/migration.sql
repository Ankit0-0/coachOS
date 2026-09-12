-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "photoKeys" JSONB;

-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN     "avatarKey" TEXT;

-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN     "avatarKey" TEXT;

-- AlterTable
ALTER TABLE "WeightEntry" DROP COLUMN "photoUrl",
ADD COLUMN     "photoKey" TEXT;
