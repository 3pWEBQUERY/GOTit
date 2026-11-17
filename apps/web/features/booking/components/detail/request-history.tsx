"use client";

import { BookingTimeline } from "@app/ui";
import { useTranslations } from "next-intl";
import { eventWord, uiStatus } from "../../lib/status-view";
import type { ClientBooking, ClientBookingEvent } from "../../lib/types";
import { useBookingFormat } from "../shared/use-booking-format";

/**
 * Verlauf (Abnahme 20.5 «Jede Statusänderung ist nachvollziehbar»): jedes
 * Ereignis mit Wort, Zeitpunkt und Rolle. Die Rolle heisst «Du» oder trägt den
 * Namen der Gegenseite, das System heisst «Automatisch»; nie andere Namen.
 */
export function RequestHistory({
  booking,
  events,
}: {
  booking: ClientBooking;
  events: readonly ClientBookingEvent[];
}) {
  const t = useTranslations("booking.history");
  const format = useBookingFormat(booking.timeZone);
  const shown = [...events].reverse().map((event) => {
    const word = eventWord(event.action, event.actorRole, booking.role);
    const proposal =
      (event.action === "counter" || event.action === "created") &&
      event.startsAt &&
      event.endsAt
        ? format.range(event.startsAt, event.endsAt)
        : null;
    const reason = event.reason;
    return {
      id: event.id,
      status: uiStatus(event.toStatus),
      statusLabel: word ? t(`events.${word}`) : t("events.other"),
      time: format.stamp(event.createdAt),
      exactTime: format.stamp(event.createdAt),
      dateTime: event.createdAt,
      actor:
        event.actorRole === null
          ? t("system")
          : event.actorRole === booking.role
            ? t("you")
            : booking.counterpartName,
      note:
        proposal || reason ? (
          <>
            {proposal ? <span className="block">{proposal}</span> : null}
            {reason ? (
              <span className="block">{t("reason", { reason })}</span>
            ) : null}
          </>
        ) : undefined,
    };
  });
  return (
    <BookingTimeline
      events={shown}
      label={t("label")}
      latestLabel={t("latest")}
    />
  );
}
