import {
  calendarEntries,
  getOwnCalendar,
  type CalendarEntry as CoreEntry,
} from "@app/core/booking";
import type { Locale } from "@app/core/locale";
import { getDb } from "@app/db";
import type { CalendarEntry, CalendarView } from "@app/ui";
import { getTranslations } from "next-intl/server";
import {
  hourRange,
  toGridEntries,
  todayIn,
  utcRange,
  visibleDays,
} from "../lib/calendar-model";
import type { CalendarParams } from "../lib/calendar-params";
import { formatSpan, rangeTitle } from "../lib/format";
import { loadRequestView, type RequestView } from "./request-view";

export interface BlockView {
  id: string;
  kind: "ABSENCE" | "BLOCKER";
  when: string;
  note: string | null;
}

export interface CalendarData {
  /** `null`: Standard, Tag auf Mobile und Woche ab 768 px. */
  view: CalendarView | null;
  date: string;
  today: string;
  timeZone: string;
  entries: CalendarEntry[];
  hours: { startHour: number; endHour: number };
  titles: Record<CalendarView, string>;
  hasWindows: boolean;
  request: RequestView | null;
  block: BlockView | null;
}

/** Namen der Mitglieder zu den Anfragen im Raster; die IDs stammen aus dem eigenen Kalender. */
async function memberNames(entries: readonly CoreEntry[]) {
  const ids = entries
    .filter((entry) => entry.kind === "request" || entry.kind === "confirmed")
    .map((entry) => entry.id)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return new Map<string, string | null>();
  const db = getDb();
  const requests = await db.bookingRequest.findMany({
    where: { id: { in: ids } },
    select: { id: true, memberUserId: true },
  });
  const users = await db.user.findMany({
    where: { id: { in: requests.map((request) => request.memberUserId) } },
    select: { id: true, username: true },
  });
  return new Map(
    requests.map((request) => [
      request.id,
      users.find((user) => user.id === request.memberUserId)?.username ?? null,
    ]),
  );
}

/** Ein Blocker oder eine Abwesenheit des eigenen Profils, für das Seitenpanel. */
export async function loadBlockView(
  providerProfileId: string,
  blockId: string,
  locale: Locale,
  timeZone: string,
): Promise<BlockView | null> {
  const block = await getDb().calendarBlock.findFirst({
    where: { id: blockId, providerProfileId },
  });
  return block
    ? {
        id: block.id,
        kind: block.kind,
        when: formatSpan(block.startsAt, block.endsAt, locale, timeZone),
        note: block.note,
      }
    : null;
}

/** Alles für `/studio/kalender`: Einträge des gezeigten Zeitraums, Titel und das offene Panel. */
export async function loadCalendar(
  userId: string,
  locale: Locale,
  params: CalendarParams,
  now = new Date(),
): Promise<CalendarData | null> {
  const own = await getOwnCalendar(userId);
  if (!own) return null;
  const timeZone = own.settings.timeZone;
  const today = todayIn(timeZone, now);
  const date = params.date ?? today;
  const days = visibleDays(params.view ?? "week", date);
  const { from, to } = utcRange(days.first, days.last, timeZone);
  const week = visibleDays("week", date);
  const [result, t, request, block] = await Promise.all([
    calendarEntries(userId, from, to),
    getTranslations({ locale, namespace: "bookingStudio" }),
    params.request
      ? loadRequestView(userId, params.request, locale, now)
      : null,
    params.block
      ? loadBlockView(own.providerProfileId, params.block, locale, timeZone)
      : null,
  ]);
  const core = result?.entries ?? [];
  const names = await memberNames(core);
  const entries = toGridEntries(
    core.map((entry) => ({
      ...entry,
      counterpartName: entry.id ? (names.get(entry.id) ?? null) : null,
    })),
    timeZone,
    {
      available: t("entry.available"),
      availableStatus: t("entry.availableStatus"),
      blocker: t("entry.blocker"),
      blockerStatus: t("entry.blockerStatus"),
      absence: t("entry.absence"),
      absenceStatus: t("entry.absenceStatus"),
      request: (name) => name ?? t("memberFallback"),
      status: (status) => t(`status.${status}`),
    },
  );
  return {
    view: params.view,
    date,
    today,
    timeZone,
    entries,
    hours: hourRange(entries, days),
    titles: {
      day: rangeTitle("day", date, week.first, week.last, locale),
      week: rangeTitle("week", date, week.first, week.last, locale),
      month: rangeTitle("month", date, week.first, week.last, locale),
    },
    hasWindows: own.windows.length > 0,
    request,
    block,
  };
}
