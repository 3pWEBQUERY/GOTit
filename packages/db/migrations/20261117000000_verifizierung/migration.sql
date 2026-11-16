-- CreateEnum
CREATE TYPE "InternalRole" AS ENUM ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'MODERATOR', 'TRUST_SAFETY', 'SUPPORT', 'FINANCE', 'CONTENT_EDITOR');

-- CreateEnum
CREATE TYPE "IdentityCheckStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- AlterTable
ALTER TABLE "provider_profile" ADD COLUMN     "description" TEXT,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onboardingSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "internal_role_assignment" (
    "userId" TEXT NOT NULL,
    "role" "InternalRole" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "internal_role_assignment_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "audit_event" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_region" (
    "providerProfileId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "provider_region_pkey" PRIMARY KEY ("providerProfileId","regionId")
);

-- CreateTable
CREATE TABLE "provider_service" (
    "providerProfileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "provider_service_pkey" PRIMARY KEY ("providerProfileId","categoryId")
);

-- CreateTable
CREATE TABLE "rate_item" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "priceChf" INTEGER NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_check" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "status" "IdentityCheckStatus" NOT NULL DEFAULT 'PENDING',
    "ageOver18" BOOLEAN,
    "livenessPassed" BOOLEAN,
    "checkedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_review" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decision" "ReviewDecision",
    "reason" TEXT,
    "rule" TEXT,
    "fieldNotes" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "profile_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_event_target_createdAt_idx" ON "audit_event"("target", "createdAt");

-- CreateIndex
CREATE INDEX "audit_event_actorId_createdAt_idx" ON "audit_event"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "rate_item_providerProfileId_sortOrder_idx" ON "rate_item"("providerProfileId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "identity_check_externalRef_key" ON "identity_check"("externalRef");

-- CreateIndex
CREATE INDEX "identity_check_userId_createdAt_idx" ON "identity_check"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "profile_review_decision_submittedAt_idx" ON "profile_review"("decision", "submittedAt");

-- CreateIndex
CREATE INDEX "profile_review_providerProfileId_submittedAt_idx" ON "profile_review"("providerProfileId", "submittedAt");

-- CreateIndex
CREATE INDEX "provider_profile_status_idx" ON "provider_profile"("status");

-- AddForeignKey
ALTER TABLE "internal_role_assignment" ADD CONSTRAINT "internal_role_assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_region" ADD CONSTRAINT "provider_region_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_region" ADD CONSTRAINT "provider_region_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_service" ADD CONSTRAINT "provider_service_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_service" ADD CONSTRAINT "provider_service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_item" ADD CONSTRAINT "rate_item_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_check" ADD CONSTRAINT "identity_check_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_review" ADD CONSTRAINT "profile_review_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

