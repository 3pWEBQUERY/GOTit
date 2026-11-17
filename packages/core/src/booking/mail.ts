import { getDb } from "@app/db";
import { emailJob, enqueue } from "@app/jobs";
import { resolveNotifications } from "../account/policy";
import { DEFAULT_LOCALE, isLocale, type Locale } from "../locale";
import { createLogger } from "../observability";

const logger = createLogger("booking");

export type BookingMailTemplate =
  | "booking-new"
  | "booking-confirmed"
  | "booking-changed"
  | "booking-cancelled"
  | "booking-upcoming";

const MEMBER_PATH: Record<Locale, string> = {
  de: "termine",
  fr: "rendez-vous",
  it: "appuntamenti",
  en: "appointments",
};
const STUDIO_PATH: Record<Locale, string> = {
  de: "studio/anfragen",
  fr: "studio/demandes",
  it: "studio/richieste",
  en: "studio/requests",
};

/**
 * Erinnerungen per E-Mail (v1 FR-BOOKING-005). Ohne Namen und Einzelheiten
 * (Diskretion); der Link führt in das eigene Konto, wo die Anmeldung die
 * Berechtigung prüft. Die Kanalwahl aus den Einstellungen gilt:
 * «bookingRequest» für neue Anfragen, «bookingStatus» für alles Weitere.
 * Ein Fehler beim Einreihen bricht die Aktion nicht ab.
 */
export async function sendBookingMail(
  userId: string,
  role: "MEMBER" | "PROVIDER",
  template: BookingMailTemplate,
  requestId: string,
): Promise<void> {
  try {
    const user = await getDb().user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerified: true,
        deactivatedAt: true,
        preference: { select: { locale: true, notifications: true } },
      },
    });
    if (!user?.emailVerified || user.deactivatedAt) return;
    const event =
      template === "booking-new" ? "bookingRequest" : "bookingStatus";
    if (!resolveNotifications(user.preference?.notifications)[event].email)
      return;
    const locale =
      user.preference?.locale && isLocale(user.preference.locale)
        ? user.preference.locale
        : DEFAULT_LOCALE;
    const base = (process.env.APP_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    const path =
      role === "PROVIDER" ? STUDIO_PATH[locale] : MEMBER_PATH[locale];
    await enqueue(emailJob, {
      to: user.email,
      template,
      locale,
      url: `${base}/${locale}/${path}/${requestId}`,
    });
  } catch (error) {
    logger.error("booking_mail_failed", {
      template,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}
