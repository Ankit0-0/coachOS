-- CreateEnum
CREATE TYPE "CoachApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coachApprovalStatus" "CoachApprovalStatus";
