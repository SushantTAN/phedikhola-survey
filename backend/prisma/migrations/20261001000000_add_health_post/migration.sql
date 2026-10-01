-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN "healthPostId" TEXT;

-- CreateTable
CREATE TABLE "HealthPost" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthPost_wardId_idx" ON "HealthPost"("wardId");

-- CreateIndex
CREATE INDEX "HealthPost_name_idx" ON "HealthPost"("name");

-- AddForeignKey
ALTER TABLE "HealthPost" ADD CONSTRAINT "HealthPost_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_healthPostId_fkey" FOREIGN KEY ("healthPostId") REFERENCES "HealthPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
