import type { AccountViewer } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { getOwnProfileForEditor } from "@app/core/provider-profile";
import { ownStatsOverview, rangeEndingToday } from "@app/core/stats";
import { getFormatter, getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { PRESET_DAYS, parseStatsRange } from "../../stats/lib/range-params";
import { getTodayEntries } from "../queries/get-today-entries";
import { loadCompleteness, loadTodayCalendar } from "../queries/load-today";
import { ProfileCompletenessSection } from "./profile-completeness";
import { TodayCalendar } from "./today-calendar";
import { TODAY_FALLBACK, TODAY_PRESETS, TodayStats } from "./today-stats";
import { TodoList } from "./todo-list";

type Raw = Record<string, string | string[] | undefined>;

/**
 * Heute `/studio` für Anbieter (PRD v2 11.1): oben «Zu erledigen» und die
 * heutigen Kalendereinträge (Desktop nebeneinander, Mobile untereinander),
 * darunter höchstens vier Kennzahlen mit Vergleich und eine Linie, zuletzt
 * «Dein Profil». Der Profilstatus mit «Pausieren» kommt aus dem Layout.
 */
export async function TodayPage({
  locale,
  viewer,
  raw,
}: {
  locale: Locale;
  viewer: AccountViewer;
  raw: Raw;
}) {
  const now = new Date();
  const today = rangeEndingToday(1, now).to;
  const { preset, range } = parseStatsRange({ zeitraum: raw.zeitraum }, today, {
    allowed: TODAY_PRESETS,
    fallback: TODAY_FALLBACK,
    maxDays: PRESET_DAYS["30d"],
  });
  const provider = viewer.provider;
  const editor = await getOwnProfileForEditor(viewer.userId);
  const [t, format, entries, calendar, overview, profile] = await Promise.all([
    getTranslations({ locale, namespace: "studio.today" }),
    getFormatter({ locale }),
    getTodayEntries(locale, viewer.userId, provider, editor, now),
    loadTodayCalendar(viewer.userId, locale, now),
    ownStatsOverview(viewer.userId, range),
    editor ? loadCompleteness(viewer.userId, editor, locale) : null,
  ]);
  const visible =
    provider?.status === "PUBLISHED" || provider?.status === "PAUSED";
  const percent = new Intl.NumberFormat(`${locale}-CH`, {
    style: "percent",
    maximumFractionDigits: 0,
  });

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <TopBarTitle title={t("metaTitle")} />
      <h1 className="text-h1">
        {t("title", {
          date: format.dateTime(now, {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Europe/Zurich",
          }),
        })}
      </h1>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)] lg:items-start">
        <TodoList
          heading={t("todo")}
          entries={entries}
          emptyText={t("nothingOpen")}
        />
        <TodayCalendar
          rows={calendar}
          calendarHref={getPathname({ href: "/studio/kalender", locale })}
          labels={{
            heading: t("calendar.heading"),
            empty: t("calendar.empty"),
            open: t("calendar.open"),
            list: t("calendar.label"),
          }}
        />
      </div>

      {overview ? (
        <TodayStats
          locale={locale}
          overview={overview}
          preset={preset === "30d" ? "30d" : TODAY_FALLBACK}
        />
      ) : null}

      {profile ? (
        <ProfileCompletenessSection
          heading={t("profile.heading")}
          summary={
            profile.missing
              ? t("profile.partial", {
                  percent: percent.format(profile.percent / 100),
                  missing: t(`profile.missing.${profile.missing.part}`),
                })
              : t("profile.complete")
          }
          fix={
            profile.missing
              ? {
                  href: profile.missing.href,
                  label: t(`profile.fix.${profile.missing.part}`),
                }
              : null
          }
          marketplace={
            provider && visible
              ? {
                  href: getPathname({
                    href: {
                      pathname: "/p/[name]",
                      params: { name: provider.slug },
                    },
                    locale,
                  }),
                  label: t("viewInMarketplace"),
                }
              : null
          }
          verification={{
            href: getPathname({ href: "/studio/verifizierung", locale }),
            label: t("verificationLink"),
          }}
        />
      ) : null}
    </div>
  );
}
