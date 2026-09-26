-- CreateEnum
CREATE TYPE "DietPreference" AS ENUM ('VEGETARIAN', 'NON_VEGETARIAN');

-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN     "dietPreference" "DietPreference";
