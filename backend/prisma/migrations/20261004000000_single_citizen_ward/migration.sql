-- A citizen now belongs to exactly one ward (stored directly) instead of a list of ward assignments.
ALTER TABLE "Citizen" ADD COLUMN "wardId" TEXT;

-- Keep the first assigned ward; fall back to the tole's ward for citizens that had none.
UPDATE "Citizen" c
SET "wardId" = COALESCE(
  (SELECT a."wardId" FROM "CitizenWardAssignment" a WHERE a."citizenId" = c."id" ORDER BY a."wardId" LIMIT 1),
  (SELECT t."wardId" FROM "Tole" t WHERE t."id" = c."toleId")
);

CREATE INDEX "Citizen_wardId_idx" ON "Citizen"("wardId");
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "CitizenWardAssignment";
