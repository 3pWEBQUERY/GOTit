import { getRequestDetail } from "@app/core/booking";
import type { Locale } from "@app/core/locale";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { requireAccount } from "../../account/require-account";
import type {
  ClientBooking,
  ClientBookingEvent,
  ClientSlots,
} from "../lib/types";
import { loadFreeSlots } from "./load-slots";
import { toClientBooking, toClientEvents } from "./to-client";

export interface RequestPageData {
  booking: ClientBooking;
  events: ClientBookingEvent[];
  /** Nur für Gegenvorschläge des Mitglieds: die freien Zeiten des Anbieters. */
  slots: ClientSlots | null;
}

/**
 * Eine Anfrage des Kontos oder 404, einmal pro Anfrage für Layout und Seite.
 * Fremde IDs verhalten sich wie unbekannte (Abnahme 20.5 «Private
 * Terminangaben werden geschützt»).
 */
export const requireRequest = cache(
  async (locale: Locale, requestId: string): Promise<RequestPageData> => {
    const viewer = await requireAccount(locale);
    const [detail, t] = await Promise.all([
      getRequestDetail(viewer.userId, requestId, locale),
      getTranslations({ locale, namespace: "booking" }),
    ]);
    if (!detail) notFound();
    const booking = toClientBooking(detail, t("memberFallback"));
    const slots =
      detail.role === "MEMBER" && detail.actions.includes("counter")
        ? await loadFreeSlots(detail.profileSlug)
        : null;
    return { booking, events: toClientEvents(detail), slots };
  },
);

/** Wie `requireRequest`; ist das Konto in der Anfrage Anbieter, gehört sie ins Studio. */
export async function requireMemberRequest(
  locale: Locale,
  requestId: string,
): Promise<void> {
  const { booking } = await requireRequest(locale, requestId);
  if (booking.role === "MEMBER") return;
  redirect({
    href: { pathname: "/studio/anfragen/[id]", params: { id: requestId } },
    locale,
  });
}
