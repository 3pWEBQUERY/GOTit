-- Bewertungen, Stellungnahme, Einspruch (Schritt 1.10, Entscheid 0017).
-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'UPHELD', 'DISMISSED');

-- AlterEnum
ALTER TYPE "ReportTarget" ADD VALUE 'REVIEW';

-- AlterTable
ALTER TABLE "search_profile" ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "communication" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "organization" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "moderationReason" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_appeal" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "byRole" "ParticipantRole" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_appeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_bookingRequestId_key" ON "review"("bookingRequestId");

-- CreateIndex
CREATE INDEX "review_providerProfileId_status_publishedAt_idx" ON "review"("providerProfileId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "review_authorUserId_createdAt_idx" ON "review"("authorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "review_status_createdAt_idx" ON "review"("status", "createdAt");

-- CreateIndex
CREATE INDEX "review_appeal_status_createdAt_idx" ON "review_appeal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "review_appeal_reviewId_idx" ON "review_appeal"("reviewId");

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "booking_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_appeal" ADD CONSTRAINT "review_appeal_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Abnahme 1.10: «Ohne qualifizierenden Termin lässt sich keine Bewertung anlegen, auch nicht über die API.»
-- Unabhängig vom Code prüft die Datenbank: Die Terminanfrage ist stattgefunden (COMPLETED), das Konto ist
-- ihr Mitglied und das Profil stimmt. Termin, Autor und Profil lassen sich danach nicht mehr ändern.
CREATE OR REPLACE FUNCTION check_review_qualifies() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW."bookingRequestId" IS DISTINCT FROM OLD."bookingRequestId"
      OR NEW."authorUserId" IS DISTINCT FROM OLD."authorUserId"
      OR NEW."providerProfileId" IS DISTINCT FROM OLD."providerProfileId") THEN
    RAISE EXCEPTION 'review_immutable_link' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'INSERT' AND NOT EXISTS (
    SELECT 1 FROM "booking_request" b
    WHERE b."id" = NEW."bookingRequestId"
      AND b."status" = 'COMPLETED'
      AND b."memberUserId" = NEW."authorUserId"
      AND b."providerProfileId" = NEW."providerProfileId"
  ) THEN
    RAISE EXCEPTION 'review_not_qualified' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_qualifies BEFORE INSERT OR UPDATE ON "review" FOR EACH ROW EXECUTE FUNCTION check_review_qualifies();

-- Bewertungen 1 bis 5 je Kategorie.
ALTER TABLE "review" ADD CONSTRAINT "review_ratings_range" CHECK (
  "communication" BETWEEN 1 AND 5 AND "accuracy" BETWEEN 1 AND 5 AND "organization" BETWEEN 1 AND 5 AND "overall" BETWEEN 1 AND 5
);
