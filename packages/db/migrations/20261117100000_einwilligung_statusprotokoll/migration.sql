-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('TERMS', 'PRIVACY', 'AGE_CONFIRMATION', 'PROFILE_PUBLICATION');

-- AlterEnum
ALTER TYPE "ProviderStatus" ADD VALUE 'RESTRICTED';

-- CreateTable
CREATE TABLE "consent_record" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "version" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "consent_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_status_event" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "fromStatus" "ProviderStatus",
    "toStatus" "ProviderStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_status_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_record_userId_kind_idx" ON "consent_record"("userId", "kind");

-- CreateIndex
CREATE INDEX "provider_status_event_providerProfileId_createdAt_idx" ON "provider_status_event"("providerProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "consent_record" ADD CONSTRAINT "consent_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_status_event" ADD CONSTRAINT "provider_status_event_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Jeder Statuswechsel eines Anbieterprofils wird protokolliert (PRD v1 FR-PROFILE-005),
-- unabhängig davon, welcher Codepfad ihn auslöst.
CREATE OR REPLACE FUNCTION log_provider_status_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "provider_status_event" ("id", "providerProfileId", "fromStatus", "toStatus", "createdAt")
    VALUES (gen_random_uuid()::text, NEW."id", NULL, NEW."status", now());
  ELSIF NEW."status" IS DISTINCT FROM OLD."status" THEN
    INSERT INTO "provider_status_event" ("id", "providerProfileId", "fromStatus", "toStatus", "createdAt")
    VALUES (gen_random_uuid()::text, NEW."id", OLD."status", NEW."status", now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER provider_status_change
AFTER INSERT OR UPDATE OF "status" ON "provider_profile"
FOR EACH ROW EXECUTE FUNCTION log_provider_status_change();

-- Bestehende Profile erhalten ihren aktuellen Status als ersten Eintrag.
INSERT INTO "provider_status_event" ("id", "providerProfileId", "fromStatus", "toStatus", "createdAt")
SELECT gen_random_uuid()::text, "id", NULL, "status", "createdAt" FROM "provider_profile";
