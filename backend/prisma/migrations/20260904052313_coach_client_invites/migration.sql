-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CoachClientInvite" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientId" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "CoachClientInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachClientInvite_token_key" ON "CoachClientInvite"("token");

-- CreateIndex
CREATE INDEX "CoachClientInvite_coachId_idx" ON "CoachClientInvite"("coachId");

-- CreateIndex
CREATE INDEX "CoachClientInvite_clientEmail_idx" ON "CoachClientInvite"("clientEmail");

-- CreateIndex
CREATE INDEX "CoachClientInvite_clientId_idx" ON "CoachClientInvite"("clientId");

-- AddForeignKey
ALTER TABLE "CoachClientInvite" ADD CONSTRAINT "CoachClientInvite_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachClientInvite" ADD CONSTRAINT "CoachClientInvite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
