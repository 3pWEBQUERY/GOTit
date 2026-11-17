import { calendarEntries, getOwnCalendar } from "@app/core/booking";
import type { Locale } from "@app/core/locale";
import { UiLink } from "@app/ui";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../../shell/nav/href";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { todayIn } from "../lib/calendar-model";
import { formatSpan } from "../lib/format";
import { windowsToValue } from "../lib/windows";
import type { BlockView } from "../queries/load-calendar";
import { BlocksList } from "./blocks-list";
import { ExclusiveSwitch, SettingsForm } from "./settings-form";
import { WindowsForm } from "./windows-form";

const UPCOMING_DAYS = 180;

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 border-t border-border pt-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-h2">
          {title}
        </h2>
        {hint ? (
          <p className="max-w-reading text-small text-ink-muted">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Daten der Verfügbarkeit; `null`, wenn das Konto kein eigenes Profil hat. */
export async function loadAvailability(
  userId: string,
  locale: Locale,
  now = new Date(),
) {
  const own = await getOwnCalendar(userId);
  if (!own) return null;
  const zone = own.settings.timeZone;
  const result = await calendarEntries(
    userId,
    now,
    new Date(now.getTime() + UPCOMING_DAYS * 24 * 3600_000),
  );
  const blocks: BlockView[] = (result?.entries ?? [])
    .filter(
      (entry) =>
        (entry.kind === "absence" || entry.kind === "blocker") && entry.id,
    )
    .map((entry) => ({
      id: entry.id as string,
      kind: entry.kind === "absence" ? "ABSENCE" : "BLOCKER",
      when: formatSpan(entry.start, entry.end, locale, zone),
      note: entry.note,
    }));
  return { own, blocks, today: todayIn(zone, now) };
}

/** `/studio/kalender/verfuegbarkeit` (PRD v2 7.3): Arbeitszeiten, Regeln, Exklusivbelegung, Abwesenheiten und Blocker. */
export async function AvailabilityPage({
  locale,
  data,
}: {
  locale: Locale;
  data: NonNullable<Awaited<ReturnType<typeof loadAvailability>>>;
}) {
  const t = await getTranslations({
    locale,
    namespace: "bookingStudio.availability",
  });
  const href = createHref(locale);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TopBarTitle title={t("title")} />
      <UiLink
        href={href("/studio/kalender")}
        className="inline-flex min-h-11 items-center gap-2 self-start text-body text-ink underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden strokeWidth={1.5} className="size-5" />
        {t("back")}
      </UiLink>
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-reading text-body text-ink-muted">{t("intro")}</p>
      </div>
      <Section
        id="verfuegbarkeit-fenster"
        title={t("windowsTitle")}
        hint={t("windowsHint")}
      >
        <div className="max-w-reading">
          <WindowsForm initial={windowsToValue(data.own.windows)} />
        </div>
      </Section>
      <Section id="verfuegbarkeit-regeln" title={t("settingsTitle")}>
        <SettingsForm settings={data.own.settings} />
      </Section>
      <Section id="verfuegbarkeit-exklusiv" title={t("exclusiveTitle")}>
        <ExclusiveSwitch exclusive={data.own.settings.exclusiveBooking} />
      </Section>
      <Section
        id="verfuegbarkeit-blocker"
        title={t("blocksTitle")}
        hint={t("blocksHint")}
      >
        <div className="max-w-reading">
          <BlocksList blocks={data.blocks} today={data.today} />
        </div>
      </Section>
    </div>
  );
}
