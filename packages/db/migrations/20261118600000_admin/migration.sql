-- AlterEnum
ALTER TYPE "ReportTarget" ADD VALUE 'ORGANIZATION';
ALTER TYPE "ReportTarget" ADD VALUE 'URL';


-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('HELP', 'LEGAL', 'PAGE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReportPriority" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "ReportDecision" AS ENUM ('NO_ACTION', 'CHANGES_REQUESTED', 'CONTENT_REMOVED', 'ACCOUNT_RESTRICTED', 'ACCOUNT_SUSPENDED');

-- CreateEnum
CREATE TYPE "CaseAppealStatus" AS ENUM ('NONE', 'OPEN', 'UPHELD', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RestrictionKind" AS ENUM ('MESSAGING', 'BOOKING', 'SUSPENDED');

-- AlterTable
ALTER TABLE "message" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT;

-- AlterTable
ALTER TABLE "region" ADD COLUMN     "contentRestrictions" TEXT,
ADD COLUMN     "legalCheckedAt" TIMESTAMP(3),
ADD COLUMN     "legalCheckedById" TEXT,
ADD COLUMN     "legalNote" TEXT,
ADD COLUMN     "requiredPermits" TEXT;

-- AlterTable
ALTER TABLE "report" ADD COLUMN     "appealReason" TEXT,
ADD COLUMN     "appealStatus" "CaseAppealStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "appealedAt" TIMESTAMP(3),
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contentBlockedAt" TIMESTAMP(3),
ADD COLUMN     "contentPreviousState" TEXT,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "decision" "ReportDecision",
ADD COLUMN     "decisionReason" TEXT,
ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "number" SERIAL NOT NULL,
ADD COLUMN     "priority" "ReportPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "rule" TEXT,
ADD COLUMN     "targetUrl" TEXT;

-- Bestehende dringende Meldungen erhalten die höchste Priorität.
UPDATE "report" SET "priority" = 'CRITICAL' WHERE "urgent" = true;

-- CreateTable
CREATE TABLE "content_page" (
    "id" TEXT NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "updatedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_override" (
    "path" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_override_pkey" PRIMARY KEY ("path","locale")
);

-- CreateTable
CREATE TABLE "support_ticket" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'de',
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_reply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_restriction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "RestrictionKind" NOT NULL,
    "rule" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "until" TIMESTAMP(3),
    "reportId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedAt" TIMESTAMP(3),
    "liftedById" TEXT,
    "liftReason" TEXT,
    "previousProfileStatus" "ProviderStatus",
    "appealStatus" "CaseAppealStatus" NOT NULL DEFAULT 'NONE',
    "appealReason" TEXT,
    "appealedAt" TIMESTAMP(3),

    CONSTRAINT "account_restriction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_page_kind_locale_status_idx" ON "content_page"("kind", "locale", "status");

-- CreateIndex
CREATE UNIQUE INDEX "content_page_kind_slug_locale_key" ON "content_page"("kind", "slug", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "support_ticket_number_key" ON "support_ticket"("number");

-- CreateIndex
CREATE INDEX "support_ticket_status_createdAt_idx" ON "support_ticket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "support_reply_ticketId_createdAt_idx" ON "support_reply"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "account_restriction_userId_liftedAt_idx" ON "account_restriction"("userId", "liftedAt");

-- CreateIndex
CREATE INDEX "account_restriction_appealStatus_idx" ON "account_restriction"("appealStatus");

-- CreateIndex
CREATE UNIQUE INDEX "report_number_key" ON "report"("number");

-- AddForeignKey
ALTER TABLE "support_reply" ADD CONSTRAINT "support_reply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_restriction" ADD CONSTRAINT "account_restriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateIndex
CREATE INDEX "report_status_priority_createdAt_idx" ON "report"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "report_assignedToId_status_idx" ON "report"("assignedToId", "status");
