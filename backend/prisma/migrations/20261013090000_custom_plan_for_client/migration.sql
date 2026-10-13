-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "customForClientId" TEXT;

-- CreateIndex
CREATE INDEX "Plan_customForClientId_idx" ON "Plan"("customForClientId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_customForClientId_fkey" FOREIGN KEY ("customForClientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

