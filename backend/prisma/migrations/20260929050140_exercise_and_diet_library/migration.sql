-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'UPPER_BACK', 'LATS', 'TRAPS', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'OBLIQUES', 'FULL_BODY', 'CARDIO');

-- CreateEnum
CREATE TYPE "TrainingDay" AS ENUM ('PUSH', 'PULL', 'LEGS', 'CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'CORE', 'CARDIO', 'FULL_BODY');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'KETTLEBELL', 'BANDS', 'OTHER');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'PRE_WORKOUT', 'POST_WORKOUT');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryMuscles" "MuscleGroup"[],
    "secondaryMuscles" "MuscleGroup"[],
    "trainingDay" "TrainingDay",
    "equipment" "Equipment",
    "instructions" TEXT,
    "imageKey" TEXT,
    "videoUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealType" "MealType",
    "calories" INTEGER,
    "proteinG" INTEGER,
    "notes" TEXT,
    "imageKey" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exercise_createdById_idx" ON "Exercise"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_createdById_key" ON "Exercise"("name", "createdById");

-- CreateIndex
CREATE INDEX "DietItem_createdById_idx" ON "DietItem"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "DietItem_name_createdById_key" ON "DietItem"("name", "createdById");

-- Global names unique; nulls are distinct in the index above, and Prisma can't express a partial index.
CREATE UNIQUE INDEX "Exercise_name_global_key" ON "Exercise"("name") WHERE "createdById" IS NULL;

CREATE UNIQUE INDEX "DietItem_name_global_key" ON "DietItem"("name") WHERE "createdById" IS NULL;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietItem" ADD CONSTRAINT "DietItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
