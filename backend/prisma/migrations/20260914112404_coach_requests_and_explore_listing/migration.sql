-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN     "listedInExplore" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CoachRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "message" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "CoachRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachRequest_coachId_status_idx" ON "CoachRequest"("coachId", "status");

-- CreateIndex
CREATE INDEX "CoachRequest_clientId_status_idx" ON "CoachRequest"("clientId", "status");

-- AddForeignKey
ALTER TABLE "CoachRequest" ADD CONSTRAINT "CoachRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachRequest" ADD CONSTRAINT "CoachRequest_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
