-- Unternehmensprofil, Nachweise, Standorte, Verknüpfungen, Medien der Organisation (Schritt 1.11, Entscheid 0018).
-- CreateEnum
CREATE TYPE "OrganizationVerificationStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrganizationLinkStatus" AS ENUM ('INVITED', 'ACTIVE', 'DECLINED', 'ENDED');

-- AlterTable
ALTER TABLE "media_asset" ADD COLUMN     "isLogo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "description" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "publicEmail" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "organization_verification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "authorityConfirmed" BOOLEAN NOT NULL,
    "permitNote" TEXT,
    "status" "OrganizationVerificationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reason" TEXT,
    "decidedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "organization_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "regionId" TEXT,
    "areaLabel" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_hours" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_exception" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT true,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "note" TEXT,

    CONSTRAINT "opening_exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_link" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "locationId" TEXT,
    "status" "OrganizationLinkStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" TEXT NOT NULL,
    "message" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedBy" TEXT,

    CONSTRAINT "organization_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_verification_organizationId_submittedAt_idx" ON "organization_verification"("organizationId", "submittedAt");

-- CreateIndex
CREATE INDEX "organization_verification_status_submittedAt_idx" ON "organization_verification"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "location_organizationId_sortOrder_idx" ON "location"("organizationId", "sortOrder");

-- CreateIndex
CREATE INDEX "opening_hours_locationId_weekday_idx" ON "opening_hours"("locationId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "opening_exception_locationId_day_key" ON "opening_exception"("locationId", "day");

-- CreateIndex
CREATE INDEX "organization_link_organizationId_status_idx" ON "organization_link"("organizationId", "status");

-- CreateIndex
CREATE INDEX "organization_link_providerProfileId_status_idx" ON "organization_link"("providerProfileId", "status");

-- CreateIndex
CREATE INDEX "media_asset_organizationId_status_sortOrder_idx" ON "media_asset"("organizationId", "status", "sortOrder");

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_verification" ADD CONSTRAINT "organization_verification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_exception" ADD CONSTRAINT "opening_exception_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_link" ADD CONSTRAINT "organization_link_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_link" ADD CONSTRAINT "organization_link_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_link" ADD CONSTRAINT "organization_link_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Ein Medium gehört entweder einem Anbieterprofil oder einer Organisation, nie beiden.
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_single_owner" CHECK (NOT ("providerProfileId" IS NOT NULL AND "organizationId" IS NOT NULL));
