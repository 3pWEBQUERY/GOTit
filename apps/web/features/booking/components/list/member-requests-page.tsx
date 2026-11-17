import type { Locale } from "@app/core/locale";
import { listOwnReviews } from "@app/core/review";
import { Button, EmptyState, StatusPill, UiLink, cn } from "@app/ui";
import { CalendarCheck, CalendarClock, History } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "../../../account/require-account";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { createHref } from "../../../shell/nav/href";
import { isOpen, uiStatus } from "../../lib/status-view";
import { MEMBER_TABS, type MemberTab } from "../../lib/types";
import { loadMemberRequests } from "../../queries/load-member-requests";
import { BookingStamp, BookingWhen } from "../shared/booking-when";

export const TAB_PARAM = "ansicht";

export function parseTab(value: string | string[] | undefined): MemberTab {
  const text = typeof value === "string" ? value : value?.[0];
  return MEMBER_TABS.find((tab) => tab === text) ?? "offen";
}

const EMPTY_ICONS = {
  offen: CalendarClock,
  bestaetigt: CalendarCheck,
  vergangen: History,
} as const;

/**
 * `/termine` (v2 12.1): eigene Anfragen in drei Tabs, der aktive in der URL.
 * Jede Zeile nennt den Anbieter, die Zeit in seiner Zone, den Status als Wort
 * und bei offenen Anfragen den Ablauf.
 */
export async function MemberRequestsPage({
  locale,
  tab,
}: {
  locale: Locale;
  tab: MemberTab;
}) {
  const viewer = await requireAccount(locale);
  const [t, rows, reviewable] = await Promise.all([
    getTranslations({ locale, namespace: "booking" }),
    loadMemberRequests(viewer.userId, tab),
    // v2 12.1: Nach «Stattgefunden» erscheint in der Liste «Bewertung schreiben».
    tab === "vergangen"
      ? listOwnReviews(viewer.userId).then(
          (own) => new Set(own.pending.map((entry) => entry.id)),
        )
      : Promise.resolve(new Set<string>()),
  ]);
  const href = createHref(locale);
  const Icon = EMPTY_ICONS[tab];

  return (
    <div className="flex max-w-reading flex-col gap-6">
      <TopBarTitle title={t("list.title")} />
      <h1 className="text-h1">{t("list.title")}</h1>
      <nav aria-label={t("list.tabsLabel")}>
        <ul className="flex flex-wrap gap-1">
          {MEMBER_TABS.map((entry) => (
            <li key={entry}>
              <UiLink
                href={href({
                  pathname: "/termine",
                  query: entry === "offen" ? {} : { [TAB_PARAM]: entry },
                })}
                aria-current={entry === tab ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-3 text-small transition-colors duration-state",
                  entry === tab
                    ? "border-ink bg-ink font-[550] text-bg hover:bg-ink/90"
                    : "border-border-strong bg-surface text-ink hover:bg-surface-2",
                )}
              >
                {t(`list.tabs.${entry}`)}
              </UiLink>
            </li>
          ))}
        </ul>
      </nav>
      {rows.length === 0 ? (
        <EmptyState
          icon={<Icon strokeWidth={1.5} />}
          title={t(`list.empty.${tab}.title`)}
          description={t(`list.empty.${tab}.text`)}
          action={
            <Button asChild>
              <UiLink href={href("/")}>{t("list.discover")}</UiLink>
            </Button>
          }
        />
      ) : (
        <ul
          className="flex flex-col divide-y divide-border border-y border-border"
          data-booking-list={tab}
        >
          {rows.map((row) => (
            <li key={row.id}>
              <UiLink
                href={href({
                  pathname: "/termine/[id]",
                  params: { id: row.id },
                })}
                className="flex min-h-11 flex-col gap-2 py-4 hover:text-accent"
              >
                <span className="text-body font-[550] break-words">
                  {row.counterpartName ?? t("memberFallback")}
                </span>
                <BookingWhen
                  startsAt={row.startsAt.toISOString()}
                  endsAt={row.endsAt.toISOString()}
                  timeZone={row.timeZone}
                  className="text-small text-ink"
                />
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
                  <StatusPill
                    status={uiStatus(row.status)}
                    label={t(`status.${row.status}`)}
                  />
                  {isOpen(row.status) ? (
                    <span>
                      {t("list.expires")}{" "}
                      <BookingStamp
                        iso={row.expiresAt.toISOString()}
                        timeZone={row.timeZone}
                      />
                    </span>
                  ) : null}
                </span>
              </UiLink>
              {reviewable.has(row.id) ? (
                <p className="pb-4">
                  <UiLink
                    href={href({
                      pathname: "/bewertungen/neu/[termin]",
                      params: { termin: row.id },
                    })}
                    className="inline-flex min-h-11 items-center text-small font-[550] text-accent underline underline-offset-4"
                  >
                    {t("list.writeReview", {
                      name: row.counterpartName ?? t("memberFallback"),
                    })}
                  </UiLink>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
