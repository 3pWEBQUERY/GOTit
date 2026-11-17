import type { Locale } from "@app/core/locale";
import { Button, EmptyState, UiLink } from "@app/ui";
import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../../shell/nav/href";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import type { CalendarData } from "../queries/load-calendar";
import { CalendarBoard } from "./calendar-board";

/** `/studio/kalender` (PRD v2 11.5). Ohne Arbeitszeiten erklärt die Seite, was fehlt, und führt zur Verfügbarkeit. */
export async function CalendarPage({
  locale,
  data,
}: {
  locale: Locale;
  data: CalendarData;
}) {
  const t = await getTranslations({
    locale,
    namespace: "bookingStudio.calendar",
  });
  const href = createHref(locale);
  const availabilityHref = href("/studio/kalender/verfuegbarkeit");
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TopBarTitle title={t("title")} />
      <h1 className="text-h1">{t("title")}</h1>
      {data.hasWindows ? null : (
        <EmptyState
          icon={<CalendarDays strokeWidth={1.5} />}
          title={t("noWindowsTitle")}
          description={t("noWindowsText")}
          action={
            <Button asChild variant="primary">
              <UiLink href={availabilityHref}>{t("noWindowsAction")}</UiLink>
            </Button>
          }
          className="py-0"
        />
      )}
      <CalendarBoard
        data={data}
        basePath={href("/studio/kalender")}
        availabilityHref={availabilityHref}
        links={{
          conversation: href({
            pathname: "/studio/nachrichten/[id]",
            params: { id: "__id__" },
          }),
          request: href({
            pathname: "/studio/anfragen/[id]",
            params: { id: "__id__" },
          }),
        }}
      />
    </div>
  );
}
