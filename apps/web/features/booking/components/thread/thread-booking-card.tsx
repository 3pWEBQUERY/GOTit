"use client";

import { BookingRequestCard } from "@app/ui";
import { useTranslations } from "next-intl";
import { cardKind, isOpen } from "../../lib/status-view";
import type { ClientBooking, ClientSlots } from "../../lib/types";
import { BookingActions } from "../shared/booking-actions";
import { useBookingFormat } from "../shared/use-booking-format";

export interface ThreadBookingCardProps {
  booking: ClientBooking;
  slots: ClientSlots | null;
  /** `/termine/[id]` für Mitglieder, `/studio/anfragen/[id]` für Anbieter. */
  href: string;
}

/**
 * Die Anfrage als Karte im Verlauf (v2 11.4): Status als Wort, Zeit in der
 * Zone des Anbieters, Region und Ablauf, dazu die Aktionen der betrachtenden
 * Seite. Sie aktualisiert sich mit dem Verlauf über die Echtzeit.
 */
export function ThreadBookingCard({
  booking,
  slots,
  href,
}: ThreadBookingCardProps) {
  const t = useTranslations("booking");
  const format = useBookingFormat(booking.timeZone);
  const minutes = Math.round(
    (Date.parse(booking.endsAt) - Date.parse(booking.startsAt)) / 60_000,
  );
  const open = isOpen(booking.status);
  const proposedByMe = booking.lastProposedBy === booking.role;
  const details = [
    {
      key: "when",
      label: t("fields.when"),
      value: format.range(booking.startsAt, booking.endsAt),
    },
    {
      key: "duration",
      label: t("fields.duration"),
      value: format.duration(minutes),
    },
    ...(booking.regionName
      ? [
          {
            key: "region",
            label: t("fields.region"),
            value: booking.regionName,
          },
        ]
      : []),
    ...(open && booking.status === "NEGOTIATING"
      ? [
          {
            key: "proposal",
            label: t("fields.proposal"),
            value: proposedByMe
              ? t("proposal.mine")
              : t("proposal.theirs", { name: booking.counterpartName }),
          },
        ]
      : []),
    ...(open
      ? [
          {
            key: "expires",
            label: t("fields.expires"),
            value: format.stamp(booking.expiresAt),
          },
        ]
      : []),
  ];

  return (
    <div data-booking-card={booking.id} className="w-full">
      <BookingRequestCard
        title={t(
          booking.role === "MEMBER" ? "card.titleMember" : "card.titleProvider",
          { name: booking.counterpartName },
        )}
        status={{
          kind: cardKind(booking.status),
          label: t(`status.${booking.status}`),
        }}
        details={details}
        // Immer gerendert: Nach «Aus Sicherheitsgründen absagen» bleibt das Melden offen, auch ohne weitere Aktionen.
        actions={<BookingActions booking={booking} slots={slots} />}
        view={{ label: t("card.view"), href }}
      />
    </div>
  );
}
