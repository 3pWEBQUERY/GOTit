import { getDb } from "@app/db";
import { notifyUsers } from "../messaging/notify";
import { sendBookingMail } from "./mail";

/** Cron: offene Anfragen, deren Frist oder Beginn vorbei ist, laufen ab (v1 FR-BOOKING-003 «Abgelaufen»). */
export async function expireOpenRequests(now = new Date()): Promise<number> {
  const db = getDb();
  const due = await db.bookingRequest.findMany({
    where: {
      status: { in: ["REQUESTED", "NEGOTIATING"] },
      OR: [{ expiresAt: { lte: now } }, { startsAt: { lte: now } }],
    },
    select: {
      id: true,
      status: true,
      conversationId: true,
      memberUserId: true,
      providerProfile: { select: { userId: true } },
    },
  });
  let expired = 0;
  for (const request of due) {
    const { count } = await db.bookingRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: { status: "EXPIRED" },
    });
    if (count === 0) continue;
    await db.bookingEvent.create({
      data: {
        requestId: request.id,
        actorRole: null,
        action: "expired",
        fromStatus: request.status,
        toStatus: "EXPIRED",
      },
    });
    await notifyUsers([request.memberUserId, request.providerProfile.userId], {
      type: "conversation",
      conversationId: request.conversationId,
    });
    expired += 1;
  }
  return expired;
}

/** Cron: Erinnerung an bestätigte Termine in den nächsten 24 Stunden, einmal pro Termin (v1 FR-BOOKING-005). */
export async function sendUpcomingReminders(now = new Date()): Promise<number> {
  const db = getDb();
  const due = await db.bookingRequest.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startsAt: { gt: now, lte: new Date(now.getTime() + 24 * 3600_000) },
    },
    select: {
      id: true,
      memberUserId: true,
      providerProfile: { select: { userId: true } },
    },
  });
  let sent = 0;
  for (const request of due) {
    const { count } = await db.bookingRequest.updateMany({
      where: { id: request.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (count === 0) continue;
    await sendBookingMail(
      request.memberUserId,
      "MEMBER",
      "booking-upcoming",
      request.id,
    );
    await sendBookingMail(
      request.providerProfile.userId,
      "PROVIDER",
      "booking-upcoming",
      request.id,
    );
    sent += 1;
  }
  return sent;
}
