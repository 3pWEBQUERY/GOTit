import {
  OPEN_STATUSES,
  REQUEST_TABS,
  listRequests,
  type RequestTab,
} from "@app/core/booking";
import type { Locale } from "@app/core/locale";
import {
  Button,
  EmptyState,
  StatusPill,
  UiLink,
  cn,
  type BookingStatus as UiStatus,
} from "@app/ui";
import { Inbox } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../../shell/nav/href";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { formatMoment, formatSpan } from "../lib/format";
import { durationText } from "../queries/request-view";

export function parseTab(value: string | string[] | undefined): RequestTab {
  const text = Array.isArray(value) ? value[0] : value;
  return (REQUEST_TABS as readonly string[]).includes(text ?? "")
    ? (text as RequestTab)
    : "offen";
}

/**
 * `/studio/anfragen` (PRD v2 11.5): dieselben Anfragen wie im Kalender, als
 * Liste mit Tabs nach Status in der URL. Offene Anfragen zeigen, bis wann
 * eine Antwort möglich ist.
 */
export async function RequestsPage({
  locale,
  userId,
  tab,
}: {
  locale: Locale;
  userId: string;
  tab: RequestTab;
}) {
  const [t, ts, rows] = await Promise.all([
    getTranslations({ locale, namespace: "bookingStudio.requests" }),
    getTranslations({ locale, namespace: "bookingStudio" }),
    listRequests(userId, "PROVIDER", tab),
  ]);
  const href = createHref(locale);
  const base = href("/studio/anfragen");
  const items = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      when: formatSpan(row.startsAt, row.endsAt, locale, row.timeZone),
      duration: await durationText(locale, row.startsAt, row.endsAt),
      expires: OPEN_STATUSES.includes(row.status)
        ? formatMoment(
            new Date(Math.min(row.expiresAt.getTime(), row.startsAt.getTime())),
            locale,
            row.timeZone,
          )
        : null,
    })),
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TopBarTitle title={t("title")} />
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-reading text-body text-ink-muted">{t("intro")}</p>
      </div>
      <nav aria-label={t("tabs")}>
        <ul className="flex flex-wrap gap-1">
          {REQUEST_TABS.map((item) => (
            <li key={item}>
              <UiLink
                href={item === "offen" ? base : `${base}?status=${item}`}
                aria-current={item === tab ? "page" : undefined}
                data-request-tab={item}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-3 text-small transition-colors duration-state",
                  item === tab
                    ? "border-ink bg-ink font-[550] text-bg hover:bg-ink/90"
                    : "border-border-strong bg-surface text-ink hover:bg-surface-2",
                )}
              >
                {t(`tab.${item}`)}
              </UiLink>
            </li>
          ))}
        </ul>
      </nav>
      {items.length === 0 ? (
        <EmptyState
          icon={<Inbox strokeWidth={1.5} />}
          title={t(`empty.${tab}`)}
          action={
            <Button asChild>
              <UiLink
                href={href(
                  tab === "offen"
                    ? "/studio/kalender/verfuegbarkeit"
                    : "/studio/kalender",
                )}
              >
                {tab === "offen" ? t("emptyAction") : t("toCalendar")}
              </UiLink>
            </Button>
          }
        />
      ) : (
        <ul
          aria-label={t("listLabel", { tab: t(`tab.${tab}`) })}
          className="flex flex-col divide-y divide-border border-y border-border"
          data-request-list
        >
          {items.map((item) => (
            <li key={item.id} data-request-row={item.id}>
              <UiLink
                href={href({
                  pathname: "/studio/anfragen/[id]",
                  params: { id: item.id },
                })}
                className="flex min-h-11 flex-col gap-2 px-1 py-3 transition-colors duration-state hover:bg-surface-2 md:flex-row md:items-center md:gap-6"
              >
                <span className="min-w-0 text-body font-[550] break-words text-ink md:w-48 md:shrink-0">
                  {item.counterpartName ?? ts("memberFallback")}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="tabular text-body text-ink">
                    {item.when}
                    <span className="sr-only">,</span>
                  </span>
                  <span className="text-small text-ink-muted">
                    {item.duration}
                    {item.expires ? (
                      <>
                        <span aria-hidden> · </span>
                        <span className="sr-only">, </span>
                        <span className="tabular">
                          {t("expires", { time: item.expires })}
                        </span>
                      </>
                    ) : null}
                    <span className="sr-only">,</span>
                  </span>
                </span>
                <StatusPill
                  status={item.status.toLowerCase() as UiStatus}
                  label={ts(`status.${item.status}`)}
                  className="self-start md:self-center"
                />
              </UiLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
