-- CreateEnum
CREATE TYPE "ProfileAudience" AS ENUM ('PUBLIC', 'MEMBERS');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'IN_REVIEW', 'PUBLISHED', 'CHANGES_REQUESTED', 'BLOCKED', 'FAILED');

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'MEMBERS');

-- CreateEnum
CREATE TYPE "ReviewKind" AS ENUM ('PROFILE', 'CHANGE');

-- AlterTable
ALTER TABLE "profile_review" ADD COLUMN     "kind" "ReviewKind" NOT NULL DEFAULT 'PROFILE';

-- AlterTable
ALTER TABLE "provider_profile" ADD COLUMN     "allowBookingRequests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "contentUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "locationLabel" TEXT,
ADD COLUMN     "pendingChanges" JSONB,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "visibility" "ProfileAudience" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "rate_item" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "media_asset" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "providerProfileId" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'UPLOADING',
    "visibility" "MediaVisibility" NOT NULL DEFAULT 'PUBLIC',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "altText" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "dominantColor" TEXT,
    "originalKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "moderationNote" TEXT,
    "rightsConfirmedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_variant" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,

    CONSTRAINT "media_variant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_originalKey_key" ON "media_asset"("originalKey");

-- CreateIndex
CREATE INDEX "media_asset_providerProfileId_status_sortOrder_idx" ON "media_asset"("providerProfileId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "media_asset_status_createdAt_idx" ON "media_asset"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_variant_key_key" ON "media_variant"("key");

-- CreateIndex
CREATE UNIQUE INDEX "media_variant_mediaId_name_key" ON "media_variant"("mediaId", "name");

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_variant" ADD CONSTRAINT "media_variant_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

