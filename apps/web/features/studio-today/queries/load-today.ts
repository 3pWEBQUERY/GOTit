import { calendarEntries, getOwnCalendar } from "@app/core/booking";
import type { Locale } from "@app/core/locale";
import { listOwnMedia } from "@app/core/media";
import type { OwnProfileEditor } from "@app/core/provider-profile";
import { completeness } from "@app/core/search";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { todayIn, utcRange } from "../../booking/studio/lib/calendar-model";
import { sectionSlug } from "../../profile/sections";

/** Ein Eintrag der Spalte «Heute»: Uhrzeit, was es ist, und bei Anfragen der Weg dorthin. */
export interface TodayRow {
  key: string;
  time: string;
  label: string;
  href: string | null;
}

/**
 * Heutige Einträge des eigenen Kalenders (PRD v2 11.1), in der Zone des
 * Anbieters. Was vor Mitternacht beginnt oder danach endet, ist auf heute
 * gekürzt. Ohne Namen der Mitglieder: «Heute» ist eine Übersicht.
 */
export async function loadTodayCalendar(
  userId: string,
  locale: Locale,
  now = new Date(),
): Promise<TodayRow[]> {
  const own = await getOwnCalendar(userId);
  if (!own) return [];
  const timeZone = own.settings.timeZone;
  const today = todayIn(timeZone, now);
  const { from, to } = utcRange(today, today, timeZone);
  const [result, t, words] = await Promise.all([
    calendarEntries(userId, from, to),
    getTranslations({ locale, namespace: "bookingStudio" }),
    getTranslations({ locale, namespace: "studio.today.calendar" }),
  ]);
  const clock = new Intl.DateTimeFormat(`${locale}-CH`, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const time = (date: Date, edge: "start" | "end") => {
    if (edge === "start" && date <= from) return "00:00";
    if (edge === "end" && date >= to) return "24:00";
    return clock.format(date);
  };
  return (result?.entries ?? []).map((entry, index) => {
    const label =
      entry.kind === "available"
        ? t("entry.availableStatus")
        : entry.kind === "absence"
          ? t("entry.absenceStatus")
          : entry.kind === "blocker"
            ? t("entry.blockerStatus")
            : words("booking", {
                status: entry.status ? t(`status.${entry.status}`) : "",
              });
    const isBooking =
      (entry.kind === "request" || entry.kind === "confirmed") && entry.id;
    return {
      key: entry.id ?? `${entry.kind}-${index}`,
      time: `${time(entry.start, "start")}–${time(entry.end, "end")}`,
      label,
      href:
        isBooking && entry.id
          ? getPathname({
              href: {
                pathname: "/studio/anfragen/[id]",
                params: { id: entry.id },
              },
              locale,
            })
          : null,
    };
  });
}

export const COMPLETENESS_PARTS = [
  "shortDescription",
  "description",
  "languages",
  "services",
  "rates",
  "photos",
] as const;
export type CompletenessPart = (typeof COMPLETENESS_PARTS)[number];

export interface ProfileCompleteness {
  percent: number;
  /** Der erste fehlende Teil in der Reihenfolge des Editors, mit dem Weg dorthin. */
  missing: { part: CompletenessPart; href: string } | null;
}

/**
 * Vollständigkeit des eigenen Profils wie im Suchindex (`completeness` im
 * Kern, PRD v1 FR-SEARCH-004): Kurzbeschreibung, Beschreibung, Sprachen,
 * Angebot, sichtbare Preise und mindestens drei öffentliche Fotos.
 */
export async function loadCompleteness(
  userId: string,
  editor: OwnProfileEditor,
  locale: Locale,
): Promise<ProfileCompleteness> {
  const library = await listOwnMedia(userId);
  const photos =
    library?.media.filter(
      (media) =>
        media.status === "PUBLISHED" &&
        media.visibility === "PUBLIC" &&
        media.width !== null,
    ).length ?? 0;
  const { values } = editor;
  const facts = {
    hasShortDescription: values.basics.shortDescription.trim().length > 0,
    descriptionLength: values.description.description.length,
    languageCount: values.basics.languages.length,
    serviceCount: values.offer.categoryIds.length,
    rateCount: values.rates.rates.filter((rate) => !rate.hidden).length,
    photoCount: photos,
  };
  const complete: Record<CompletenessPart, boolean> = {
    shortDescription: facts.hasShortDescription,
    // Der Kern zählt die Beschreibung ab 200 Zeichen voll (DESCRIPTION_FULL).
    description: facts.descriptionLength >= 200,
    languages: facts.languageCount > 0,
    services: facts.serviceCount > 0,
    rates: facts.rateCount > 0,
    photos: facts.photoCount >= 3,
  };
  const part = COMPLETENESS_PARTS.find((entry) => !complete[entry]) ?? null;
  const section = {
    shortDescription: "basics",
    description: "description",
    languages: "basics",
    services: "offer",
    rates: "rates",
  } as const;
  return {
    percent: completeness(facts),
    missing: part
      ? {
          part,
          href:
            part === "photos"
              ? getPathname({ href: "/studio/medien", locale })
              : getPathname({
                  href: {
                    pathname: "/studio/profil/[abschnitt]",
                    params: { abschnitt: sectionSlug(locale, section[part]) },
                  },
                  locale,
                }),
        }
      : null,
  };
}
