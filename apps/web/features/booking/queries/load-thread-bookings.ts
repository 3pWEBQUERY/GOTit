import { getRequestDetail, requestsInConversation } from "@app/core/booking";
import type { Locale } from "@app/core/locale";
import { getTranslations } from "next-intl/server";
import type { ClientBooking, ClientSlots } from "../lib/types";
import { loadFreeSlots } from "./load-slots";
import { toClientBooking } from "./to-client";

export interface ThreadBookings {
  bookings: ClientBooking[];
  /** Freie Zeiten für einen Gegenvorschlag des Mitglieds; sonst `null`. */
  slots: ClientSlots | null;
}

/**
 * Anfragen einer Unterhaltung für die Karten im Verlauf (v2 11.4): Thread und
 * Anfrage sind zwei Ansichten desselben Vorgangs. Nur für Beteiligte; der
 * Kern gibt Fremden eine leere Liste.
 */
export async function loadThreadBookings(
  userId: string,
  conversationId: string,
  locale: Locale,
): Promise<ThreadBookings> {
  const [rows, t] = await Promise.all([
    requestsInConversation(userId, conversationId),
    getTranslations({ locale, namespace: "booking" }),
  ]);
  const details = await Promise.all(
    rows.map((row) => getRequestDetail(userId, row.id, locale)),
  );
  const bookings = details.flatMap((detail, index) => {
    const row = rows[index];
    return detail && row
      ? [
          {
            ...toClientBooking(detail, t("memberFallback")),
            createdAt: row.createdAt.toISOString(),
          },
        ]
      : [];
  });
  const counter = bookings.find(
    (booking) =>
      booking.role === "MEMBER" && booking.actions.includes("counter"),
  );
  return {
    bookings,
    slots: counter ? await loadFreeSlots(counter.profileSlug) : null,
  };
}
