"use client";

import {
  Button,
  CalendarDay,
  CalendarLegend,
  CalendarMonth,
  CalendarToolbar,
  CalendarWeek,
  UiLink,
  shiftCalendarDate,
  type CalendarDayCounts,
  type CalendarEntry,
  type CalendarView,
} from "@app/ui";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  calendarQuery,
  entryKey,
  type CalendarParams,
} from "../lib/calendar-params";
import { useZoneNote } from "../lib/zone-note";
import type { CalendarData } from "../queries/load-calendar";
import { BlockDialog, type BlockDraft } from "./block-dialog";
import { BlockPanel, RequestPanel, type PanelLinks } from "./calendar-panels";

type Panel = { kind: "request" | "block"; id: string } | null;

function serverPanel(data: CalendarData): Panel {
  if (data.request) return { kind: "request", id: data.request.id };
  if (data.block) return { kind: "block", id: data.block.id };
  return null;
}

const panelKey = (panel: Panel) => (panel ? `${panel.kind}:${panel.id}` : "");

/**
 * Kalender im Studio (PRD 11.5): Kopfzeile, Legende, Tag, Woche oder Monat und
 * die Seitenpanels. Ohne `ansicht` in der URL zeigt er auf Mobile den Tag mit
 * Wochenstreifen und ab 768 px die Woche; beide Varianten stehen im Dokument,
 * die nicht passende ist ausgeblendet. Ansicht, Datum und Panel stehen in der URL.
 */
export function CalendarBoard({
  data,
  basePath,
  availabilityHref,
  links,
}: {
  data: CalendarData;
  basePath: string;
  availabilityHref: string;
  links: PanelLinks;
}) {
  const t = useTranslations("bookingStudio.calendar");
  const locale = `${useLocale()}-CH`;
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const zoneNote = useZoneNote(data.timeZone);
  const fromServer = serverPanel(data);
  const [panel, setPanel] = useState<Panel>(fromServer);
  const [seen, setSeen] = useState(panelKey(fromServer));
  if (seen !== panelKey(fromServer)) {
    setSeen(panelKey(fromServer));
    setPanel(fromServer);
  }
  const [draft, setDraft] = useState<{
    open: boolean;
    key: number;
    initial: BlockDraft;
  }>({
    open: false,
    key: 0,
    initial: {
      kind: "BLOCKER",
      startDay: data.date,
      startTime: "12:00",
      endDay: data.date,
      endTime: "13:00",
    },
  });

  function go(next: Partial<CalendarParams>) {
    const params: Partial<CalendarParams> = {
      view: data.view,
      date: data.date === data.today ? null : data.date,
      ...next,
    };
    startTransition(() =>
      router.push(`${basePath}${calendarQuery(params)}`, { scroll: false }),
    );
  }

  function openBlockDialog(initial?: Partial<BlockDraft>) {
    setDraft((current) => ({
      open: true,
      key: current.key + 1,
      initial: {
        kind: "BLOCKER",
        startDay: data.date,
        startTime: "12:00",
        endDay: data.date,
        endTime: "13:00",
        ...initial,
      },
    }));
  }

  function select(entry: CalendarEntry) {
    const key = entryKey(entry.id);
    if (!key) return;
    if (key.kind === "available") {
      openBlockDialog({
        startDay: key.start.slice(0, 10),
        startTime: key.start.slice(11, 16),
        endDay: key.end.slice(0, 10),
        endTime:
          key.end.slice(11, 16) === "00:00" ? "23:59" : key.end.slice(11, 16),
      });
      return;
    }
    setPanel({ kind: key.kind, id: key.id });
    go(
      key.kind === "request"
        ? { request: key.id, block: null }
        : { block: key.id, request: null },
    );
  }

  function closePanel() {
    setPanel(null);
    go({ request: null, block: null });
  }

  const actions = (
    <>
      <Button asChild>
        <UiLink href={availabilityHref}>{t("editAvailability")}</UiLink>
      </Button>
      <Button
        variant="primary"
        icon={<Plus aria-hidden strokeWidth={1.5} />}
        onClick={() => openBlockDialog()}
      >
        {t("addBlocker")}
      </Button>
    </>
  );

  const toolbar = (view: CalendarView) => (
    <CalendarToolbar
      title={data.titles[view]}
      view={view}
      onViewChange={(next) => go({ view: next })}
      onPrevious={() =>
        go({ view: data.view, date: shiftCalendarDate(view, data.date, -1) })
      }
      onNext={() =>
        go({ view: data.view, date: shiftCalendarDate(view, data.date, 1) })
      }
      onToday={() => go({ date: null })}
      labels={{
        previous: t(`previous.${view}`),
        next: t(`next.${view}`),
        today: t("today"),
        view: t("view"),
        day: t("day"),
        week: t("week"),
        month: t("month"),
      }}
      actions={actions}
    />
  );

  const dayLabel = (_iso: string, counts: CalendarDayCounts) =>
    [
      counts.available > 0 ? t("monthAvailable") : "",
      counts.request > 0 ? t("monthRequests", { count: counts.request }) : "",
      counts.confirmed > 0
        ? t("monthConfirmed", { count: counts.confirmed })
        : "",
      counts.blocker > 0 ? t("monthBlockers", { count: counts.blocker }) : "",
    ]
      .filter(Boolean)
      .join(", ");

  const common = {
    entries: data.entries,
    locale,
    today: data.today,
    timeZoneNote: zoneNote,
  };
  const hours = data.hours;
  const week = (
    <CalendarWeek
      {...common}
      {...hours}
      date={data.date}
      label={t("gridLabel", { range: data.titles.week })}
      labels={{ today: t("today"), emptyDay: t("emptyDay") }}
      onEntrySelect={select}
    />
  );
  const day = (
    <CalendarDay
      {...common}
      {...hours}
      date={data.date}
      labels={{
        today: t("today"),
        weekStrip: t("weekStrip"),
        emptyDay: t("emptyDay"),
      }}
      onDateChange={(date) => go({ date })}
      onEntrySelect={select}
    />
  );
  const month = (
    <CalendarMonth
      {...common}
      month={data.date}
      label={data.titles.month}
      dayLabel={dayLabel}
      todayLabel={t("today")}
      selectedDate={data.date}
      onDateSelect={(date) => go({ view: "day", date })}
    />
  );

  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      data-calendar
      data-view={data.view ?? "auto"}
      aria-busy={navigating || undefined}
    >
      {data.view ? (
        toolbar(data.view)
      ) : (
        <>
          <div className="md:hidden">{toolbar("day")}</div>
          <div className="hidden md:block">{toolbar("week")}</div>
        </>
      )}
      <CalendarLegend
        label={t("legend")}
        items={[
          { kind: "available", label: t("legendAvailable") },
          { kind: "request", label: t("legendRequest") },
          { kind: "confirmed", label: t("legendConfirmed") },
          { kind: "blocker", label: t("legendBlocker") },
        ]}
      />
      {data.view === "week" ? week : null}
      {data.view === "day" ? day : null}
      {data.view === "month" ? month : null}
      {data.view === null ? (
        <>
          <div className="md:hidden" data-calendar-mobile>
            {day}
          </div>
          <div className="hidden md:block" data-calendar-desktop>
            {week}
          </div>
        </>
      ) : null}
      <RequestPanel
        open={panel?.kind === "request"}
        loading={navigating}
        request={
          panel?.kind === "request" && data.request?.id === panel.id
            ? data.request
            : null
        }
        links={links}
        onClose={closePanel}
      />
      <BlockPanel
        open={panel?.kind === "block"}
        loading={navigating}
        block={
          panel?.kind === "block" && data.block?.id === panel.id
            ? data.block
            : null
        }
        onClose={closePanel}
        onRemoved={closePanel}
      />
      <BlockDialog
        key={draft.key}
        open={draft.open}
        onOpenChange={(open) => setDraft((current) => ({ ...current, open }))}
        initial={draft.initial}
      />
    </div>
  );
}
