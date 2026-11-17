import type { RequestDetail } from "@app/core/booking";
import type { ClientBooking, ClientBookingEvent } from "../lib/types";
import { visibleReason } from "../lib/status-view";

/** Detail des Kerns für den Browser; die private Notiz bleibt auf dem Server (Entscheid 0016). */
export function toClientBooking(
  detail: RequestDetail,
  fallbackName: string,
): ClientBooking {
  return {
    id: detail.id,
    conversationId: detail.conversationId,
    status: detail.status,
    startsAt: detail.startsAt.toISOString(),
    endsAt: detail.endsAt.toISOString(),
    expiresAt: detail.expiresAt.toISOString(),
    createdAt: (detail.events[0]?.createdAt ?? detail.startsAt).toISOString(),
    timeZone: detail.timeZone,
    counterpartName: detail.counterpartName ?? fallbackName,
    profileSlug: detail.profileSlug,
    role: detail.role,
    lastProposedBy: detail.lastProposedBy,
    actions: detail.actions,
    regionName: detail.regionName,
    message: detail.message,
  };
}

export function toClientEvents(detail: RequestDetail): ClientBookingEvent[] {
  return detail.events.map((event) => ({
    id: event.id,
    actorRole: event.actorRole,
    action: event.action,
    toStatus: event.toStatus,
    startsAt: event.startsAt?.toISOString() ?? null,
    endsAt: event.endsAt?.toISOString() ?? null,
    reason: visibleReason(event, detail.role),
    createdAt: event.createdAt.toISOString(),
  }));
}
