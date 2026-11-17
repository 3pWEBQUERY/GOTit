import { getDb, type Prisma } from "@app/db";
import type { Viewer } from "../identity/types";
import { isBlockedBetween, participantOf } from "../messaging/access";
import { isRestricted } from "../moderation/restrictions";
import { startConversation } from "../messaging/conversations";
import { notifyUsers } from "../messaging/notify";
import { contactOptions } from "../provider-profile/public-policy";
import { fitsAvailability, overlapsBooking } from "./availability";
import { availabilityInput } from "./calendar";
import { sendBookingMail, type BookingMailTemplate } from "./mail";
import { MAX_DAYS_AHEAD, actionSchema, requestSchema } from "./schemas";
import {
  allowedActions,
  nextStatus,
  type BookingAction,
  type BookingRole,
  type BookingStatus,
} from "./status";
import { recordStat } from "../stats/record";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export type CreateRequestResult =
  | { ok: true; requestId: string; conversationId: string }
  | {
      ok: false;
      reason:
        | "not-found"
        | "not-allowed"
        | "own-profile"
        | "undeliverable"
        | "invalid"
        | "unavailable"
        | "too-soon"
        | "too-far"
        | "duplicate"
        | "restricted";
    };

/**
 * Terminanfrage eines Mitglieds (v1 FR-BOOKING-002, v2 10.2): unverbindlich,
 * nur zu verfügbaren Zeiten, nur bei Profilen mit freigeschalteten Anfragen.
 * Die Anfrage hängt an der Unterhaltung; existiert keine, entsteht sie.
 * Eine offene Anfrage pro Unterhaltung genügt, eine zweite wird abgelehnt.
 */
export async function createBookingRequest(
  viewer: Viewer,
  profileSlug: string,
  input: unknown,
  now = new Date(),
): Promise<CreateRequestResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (viewer.kind !== "account" || !viewer.ageConfirmed)
    return { ok: false, reason: "not-allowed" };
  // Eingeschränkt durch die Moderation (v1 9.2): keine Terminanfragen.
  if (await isRestricted(viewer.userId, "BOOKING"))
    return { ok: false, reason: "restricted" };
  const db = getDb();
  const profile = await db.providerProfile.findUnique({
    where: { slug: profileSlug },
    select: {
      id: true,
      userId: true,
      status: true,
      allowMessages: true,
      allowBookingRequests: true,
    },
  });
  if (!profile) return { ok: false, reason: "not-found" };
  if (profile.userId === viewer.userId)
    return { ok: false, reason: "own-profile" };
  if (
    !contactOptions(
      profile.status,
      profile.allowMessages,
      profile.allowBookingRequests,
    ).bookingRequests
  )
    return { ok: false, reason: "not-allowed" };
  if (await isBlockedBetween(viewer.userId, profile.userId))
    return { ok: false, reason: "undeliverable" };

  const { startsAt, durationMinutes, regionId, message } = parsed.data;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const availability = await availabilityInput(
    profile.id,
    new Date(startsAt.getTime() - DAY),
    new Date(endsAt.getTime() + DAY),
  );
  if (
    startsAt.getTime() <
    now.getTime() + availability.settings.minNoticeHours * HOUR
  )
    return { ok: false, reason: "too-soon" };
  if (startsAt.getTime() > now.getTime() + MAX_DAYS_AHEAD * DAY)
    return { ok: false, reason: "too-far" };
  if (!fitsAvailability(availability, { start: startsAt, end: endsAt }))
    return { ok: false, reason: "unavailable" };
  const region = regionId
    ? await db.providerRegion.findFirst({
        where: {
          providerProfileId: profile.id,
          regionId,
          region: { approved: true },
        },
        select: { regionId: true },
      })
    : null;
  if (regionId && !region) return { ok: false, reason: "invalid" };

  const conversation = await startConversation(viewer, profileSlug);
  if (!conversation.ok)
    return {
      ok: false,
      reason:
        conversation.reason === "own-profile"
          ? "own-profile"
          : conversation.reason === "undeliverable"
            ? "undeliverable"
            : "not-allowed",
    };
  const open = await db.bookingRequest.count({
    where: {
      conversationId: conversation.conversationId,
      status: { in: ["REQUESTED", "NEGOTIATING"] },
    },
  });
  if (open > 0) return { ok: false, reason: "duplicate" };

  const expiresAt = new Date(
    Math.min(
      now.getTime() + availability.settings.requestTtlHours * HOUR,
      startsAt.getTime(),
    ),
  );
  const request = await db.bookingRequest.create({
    data: {
      conversationId: conversation.conversationId,
      providerProfileId: profile.id,
      memberUserId: viewer.userId,
      startsAt,
      endsAt,
      lastProposedBy: "MEMBER",
      regionId: region?.regionId ?? null,
      message: message || null,
      expiresAt,
      events: {
        create: {
          actorRole: "MEMBER",
          action: "created",
          toStatus: "REQUESTED",
          startsAt,
          endsAt,
        },
      },
    },
    select: { id: true },
  });
  await db.conversation.update({
    where: { id: conversation.conversationId },
    data: { lastMessageAt: now },
  });
  await notifyUsers([viewer.userId, profile.userId], {
    type: "conversation",
    conversationId: conversation.conversationId,
  });
  await sendBookingMail(profile.userId, "PROVIDER", "booking-new", request.id);
  await recordStat(profile.id, "BOOKING_REQUEST", {}, now);
  return {
    ok: true,
    requestId: request.id,
    conversationId: conversation.conversationId,
  };
}

export type ActResult =
  | { ok: true; status: BookingStatus }
  | {
      ok: false;
      reason:
        | "not-found"
        | "invalid"
        | "not-allowed"
        | "conflict"
        | "unavailable"
        | "stale"
        | "restricted";
    };

const MAIL_FOR: Partial<Record<BookingAction, BookingMailTemplate>> = {
  accept: "booking-confirmed",
  counter: "booking-changed",
  decline: "booking-cancelled",
  cancel: "booking-cancelled",
  "cancel-safety": "booking-cancelled",
};

/**
 * Eine Aktion auf einer Anfrage (v1 FR-BOOKING-003/004, Abnahme 20.5): nur
 * Beteiligte, nur erlaubte Übergänge, jeder Wechsel als Ereignis im Verlauf.
 * Atomar: Ändert sich die Anfrage gleichzeitig, verliert der zweite Aufruf
 * («stale»). Bei Exklusivbelegung verhindert eine Sperre auf dem Profil zwei
 * gleichzeitige Bestätigungen derselben Zeit (Doppelbuchung).
 */
export async function actOnBookingRequest(
  viewer: Viewer,
  requestId: string,
  input: unknown,
  now = new Date(),
): Promise<ActResult> {
  if (viewer.kind !== "account" || requestId.length > 64)
    return { ok: false, reason: "not-found" };
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  // Absagen bleibt immer möglich, auch eingeschränkt (Entscheid 0016, Sicherheit).
  if (
    (parsed.data.action === "accept" || parsed.data.action === "counter") &&
    (await isRestricted(viewer.userId, "BOOKING"))
  )
    return { ok: false, reason: "restricted" };
  const db = getDb();
  const request = await db.bookingRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      conversationId: true,
      providerProfileId: true,
      status: true,
      startsAt: true,
      endsAt: true,
      lastProposedBy: true,
    },
  });
  if (!request) return { ok: false, reason: "not-found" };
  const participation = await participantOf(
    viewer.userId,
    request.conversationId,
  );
  if (!participation) return { ok: false, reason: "not-found" };
  const role: BookingRole = participation.role;
  const data = parsed.data;
  if (!allowedActions(request, role, now).includes(data.action))
    return { ok: false, reason: "not-allowed" };

  let startsAt = request.startsAt;
  let endsAt = request.endsAt;
  if (data.action === "counter") {
    startsAt = data.startsAt;
    endsAt = new Date(startsAt.getTime() + data.durationMinutes * 60_000);
    if (
      startsAt.getTime() <= now.getTime() ||
      startsAt.getTime() > now.getTime() + MAX_DAYS_AHEAD * DAY
    )
      return { ok: false, reason: "invalid" };
    // Das Mitglied schlägt nur verfügbare Zeiten vor; der Anbieter kennt seinen Kalender selbst.
    if (role === "MEMBER") {
      const availability = await availabilityInput(
        request.providerProfileId,
        new Date(startsAt.getTime() - DAY),
        new Date(endsAt.getTime() + DAY),
      );
      if (!fitsAvailability(availability, { start: startsAt, end: endsAt }))
        return { ok: false, reason: "unavailable" };
    }
  }
  const toStatus = nextStatus(data.action);
  const reason =
    "reason" in data && data.reason ? data.reason.trim() || null : null;

  const outcome = await db.$transaction(async (tx): Promise<ActResult> => {
    if (data.action === "accept") {
      await tx.$queryRaw`SELECT id FROM provider_profile WHERE id = ${request.providerProfileId} FOR UPDATE`;
      const availability = await availabilityInput(
        request.providerProfileId,
        new Date(startsAt.getTime() - DAY),
        new Date(endsAt.getTime() + DAY),
      );
      if (availability.settings.exclusiveBooking) {
        const confirmed = await tx.bookingRequest.findMany({
          where: {
            providerProfileId: request.providerProfileId,
            status: "CONFIRMED",
            id: { not: request.id },
            endsAt: { gt: new Date(startsAt.getTime() - DAY) },
            startsAt: { lt: new Date(endsAt.getTime() + DAY) },
          },
          select: { startsAt: true, endsAt: true },
        });
        if (
          overlapsBooking(
            confirmed.map((entry) => ({
              start: entry.startsAt,
              end: entry.endsAt,
            })),
            { start: startsAt, end: endsAt },
            availability.settings.bufferMinutes,
          )
        )
          return { ok: false, reason: "conflict" };
      }
    }
    const update: Prisma.BookingRequestUpdateManyMutationInput = {
      status: toStatus,
    };
    if (data.action === "counter") {
      const settings = await tx.calendarSettings.findUnique({
        where: { providerProfileId: request.providerProfileId },
        select: { requestTtlHours: true },
      });
      Object.assign(update, {
        startsAt,
        endsAt,
        lastProposedBy: role,
        expiresAt: new Date(
          Math.min(
            now.getTime() + (settings?.requestTtlHours ?? 48) * HOUR,
            startsAt.getTime(),
          ),
        ),
      });
    }
    const { count } = await tx.bookingRequest.updateMany({
      where: {
        id: request.id,
        status: request.status,
        startsAt: request.startsAt,
        lastProposedBy: request.lastProposedBy,
      },
      data: update,
    });
    if (count === 0) return { ok: false, reason: "stale" };
    await tx.bookingEvent.create({
      data: {
        requestId: request.id,
        actorRole: role,
        action: data.action,
        fromStatus: request.status,
        toStatus,
        startsAt: data.action === "counter" ? startsAt : null,
        endsAt: data.action === "counter" ? endsAt : null,
        reason,
      },
    });
    return { ok: true, status: toStatus };
  });
  if (!outcome.ok) return outcome;
  if (data.action === "accept") await recordStat(request.providerProfileId, "BOOKING_CONFIRMED", {}, now);
  await notifyUsers([viewer.userId, participation.counterpartId], {
    type: "conversation",
    conversationId: request.conversationId,
  });
  const template = MAIL_FOR[data.action];
  if (template)
    await sendBookingMail(
      participation.counterpartId,
      role === "MEMBER" ? "PROVIDER" : "MEMBER",
      template,
      request.id,
    );
  return outcome;
}

/** Private Notiz des Anbieters zu einer Anfrage (v1 FR-BOOKING-001 «Private Notizen»). */
export async function setProviderNote(
  userId: string,
  requestId: string,
  note: string,
): Promise<boolean> {
  if (requestId.length > 64 || note.length > 1000) return false;
  const db = getDb();
  const request = await db.bookingRequest.findUnique({
    where: { id: requestId },
    select: { conversationId: true },
  });
  if (!request) return false;
  const participation = await participantOf(userId, request.conversationId);
  if (participation?.role !== "PROVIDER") return false;
  await db.bookingRequest.update({
    where: { id: requestId },
    data: { providerNote: note.trim() || null },
  });
  return true;
}
