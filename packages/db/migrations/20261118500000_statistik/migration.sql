-- Kennzahlen: Rohereignisse ohne Personenbezug und Tagesaggregation (Schritt 1.12, Entscheid 0019).
-- CreateEnum
CREATE TYPE "StatKind" AS ENUM ('SEARCH_IMPRESSION', 'PROFILE_VIEW', 'CONTACT_ACTION', 'BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'FAVORITE_ADDED', 'FAVORITE_REMOVED', 'MEDIA_VIEW');

-- CreateTable
CREATE TABLE "stat_event" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "kind" "StatKind" NOT NULL,
    "mediaId" TEXT,
    "searchKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stat_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stat_daily" (
    "providerProfileId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "kind" "StatKind" NOT NULL,
    "dimension" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL,

    CONSTRAINT "stat_daily_pkey" PRIMARY KEY ("providerProfileId","day","kind","dimension")
);

-- CreateTable
CREATE TABLE "stat_aggregated_day" (
    "day" TEXT NOT NULL,
    "aggregatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stat_aggregated_day_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "stat_event_providerProfileId_kind_occurredAt_idx" ON "stat_event"("providerProfileId", "kind", "occurredAt");

-- CreateIndex
CREATE INDEX "stat_event_occurredAt_idx" ON "stat_event"("occurredAt");

-- CreateIndex
CREATE INDEX "stat_daily_providerProfileId_kind_day_idx" ON "stat_daily"("providerProfileId", "kind", "day");

-- AddForeignKey
ALTER TABLE "stat_event" ADD CONSTRAINT "stat_event_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stat_daily" ADD CONSTRAINT "stat_daily_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

