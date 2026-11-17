-- Verfügbarkeit, Kalender, Terminanfragen (Schritt 1.9, Entscheid 0016).
-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'NEGOTIATING', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'COMPLETED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CalendarBlockKind" AS ENUM ('ABSENCE', 'BLOCKER');

-- CreateTable
CREATE TABLE "calendar_settings" (
    "providerProfileId" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Zurich',
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "exclusiveBooking" BOOLEAN NOT NULL DEFAULT true,
    "requestTtlHours" INTEGER NOT NULL DEFAULT 48,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_settings_pkey" PRIMARY KEY ("providerProfileId")
);

-- CreateTable
CREATE TABLE "availability_window" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "availability_window_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_block" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "kind" "CalendarBlockKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_request" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "lastProposedBy" "ParticipantRole" NOT NULL,
    "regionId" TEXT,
    "message" TEXT,
    "providerNote" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_event" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorRole" "ParticipantRole",
    "action" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "availability_window_providerProfileId_weekday_idx" ON "availability_window"("providerProfileId", "weekday");

-- CreateIndex
CREATE INDEX "calendar_block_providerProfileId_startsAt_idx" ON "calendar_block"("providerProfileId", "startsAt");

-- CreateIndex
CREATE INDEX "booking_request_providerProfileId_startsAt_idx" ON "booking_request"("providerProfileId", "startsAt");

-- CreateIndex
CREATE INDEX "booking_request_memberUserId_startsAt_idx" ON "booking_request"("memberUserId", "startsAt");

-- CreateIndex
CREATE INDEX "booking_request_status_expiresAt_idx" ON "booking_request"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "booking_request_conversationId_idx" ON "booking_request"("conversationId");

-- CreateIndex
CREATE INDEX "booking_event_requestId_createdAt_idx" ON "booking_event"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "calendar_settings" ADD CONSTRAINT "calendar_settings_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_window" ADD CONSTRAINT "availability_window_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_block" ADD CONSTRAINT "calendar_block_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_request" ADD CONSTRAINT "booking_request_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_request" ADD CONSTRAINT "booking_request_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_event" ADD CONSTRAINT "booking_event_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "booking_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

