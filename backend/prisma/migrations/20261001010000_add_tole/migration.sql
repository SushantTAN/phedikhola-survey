CREATE TABLE "Tole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "healthPostId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tole_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Citizen" ADD COLUMN "toleId" TEXT;

CREATE UNIQUE INDEX "Tole_wardId_name_key" ON "Tole"("wardId", "name");
CREATE INDEX "Tole_healthPostId_idx" ON "Tole"("healthPostId");
CREATE INDEX "Tole_name_idx" ON "Tole"("name");
CREATE INDEX "Citizen_toleId_idx" ON "Citizen"("toleId");

ALTER TABLE "Tole" ADD CONSTRAINT "Tole_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tole" ADD CONSTRAINT "Tole_healthPostId_fkey" FOREIGN KEY ("healthPostId") REFERENCES "HealthPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_toleId_fkey" FOREIGN KEY ("toleId") REFERENCES "Tole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
