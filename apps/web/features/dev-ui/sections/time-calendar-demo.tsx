"use client";

import { Button, CalendarDay, CalendarLegend, CalendarMonth, CalendarToolbar, CalendarWeek, shiftCalendarDate, weekDays, type CalendarEntry, type CalendarView } from "@app/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { TimeDemoBlock } from "./time-demo-block";
import { DEMO_TODAY, demoDayLabel, demoEntries, demoRangeTitle, legendItems, viewWords, ZONE_NOTE } from "./time-demo-data";

const weekLabels = { today: "Heute", emptyDay: "Keine Einträge" };
const dayLabels = { today: "Heute", weekStrip: "Tag der Woche wählen", emptyDay: "An diesem Tag steht nichts an." };

function describeEntry(entry: CalendarEntry | null): string {
  return entry ? `Gewählt: ${entry.label}, ${entry.statusLabel}` : "Noch kein Eintrag gewählt";
}

/** Kalenderansichten der Testseite «Zeit»: Kopfzeile, Woche, Tag und Monat. */
export function TimeCalendarDemo() {
  return (
    <>
      <ToolbarDemo />
      <WeekDemo />
      <DayDemo />
      <MonthDemo />
    </>
  );
}

function ToolbarDemo() {
  const [view, setView] = useState<CalendarView>("week");
  const [date, setDate] = useState(DEMO_TODAY);
  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const toolbarLabels = { ...viewWords[view], today: "Heute", view: "Ansicht", day: "Tag", week: "Woche", month: "Monat" };

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">CalendarToolbar</h2>
      <TimeDemoBlock title="Mit Ansicht und Aktionen verbunden" wide>
        <CalendarToolbar
          title={demoRangeTitle(view, date, weekDays(date))}
          view={view}
          onViewChange={setView}
          onPrevious={() => setDate(shiftCalendarDate(view, date, -1))}
          onNext={() => setDate(shiftCalendarDate(view, date, 1))}
          onToday={() => setDate(DEMO_TODAY)}
          labels={toolbarLabels}
          actions={
            <>
              <Button variant="secondary">Verfügbarkeit bearbeiten</Button>
              <Button variant="primary" icon={<Plus aria-hidden strokeWidth={1.5} />}>
                Blocker anlegen
              </Button>
            </>
          }
        />
        <CalendarLegend label="Legende" items={legendItems} />
        {view === "week" ? <CalendarWeek date={date} entries={demoEntries} locale="de-CH" label={`Kalender, ${demoRangeTitle("week", date, weekDays(date))}`} labels={weekLabels} today={DEMO_TODAY} startHour={12} endHour={22} onEntrySelect={setSelected} /> : null}
        {view === "day" ? <CalendarDay date={date} entries={demoEntries} locale="de-CH" labels={dayLabels} today={DEMO_TODAY} startHour={12} endHour={22} onDateChange={setDate} onEntrySelect={setSelected} /> : null}
        {view === "month" ? (
          <CalendarMonth
            month={date}
            entries={demoEntries}
            locale="de-CH"
            label={demoRangeTitle("month", date, [])}
            dayLabel={demoDayLabel}
            todayLabel="Heute"
            today={DEMO_TODAY}
            selectedDate={date}
            onDateSelect={(next) => {
              setDate(next);
              setView("day");
            }}
          />
        ) : null}
        <p role="status" className="text-small text-ink-muted">
          {describeEntry(selected)}
        </p>
      </TimeDemoBlock>
      <TimeDemoBlock title="Nur Tag und Woche, ohne Aktionen" wide>
        <CalendarToolbar
          title="16. Nov. – 22. Nov. 2026"
          view="day"
          views={["day", "week"]}
          onViewChange={() => undefined}
          onPrevious={() => undefined}
          onNext={() => undefined}
          onToday={() => undefined}
          labels={{ ...viewWords.day, today: "Heute", view: "Ansicht", day: "Tag", week: "Woche", month: "Monat" }}
        />
      </TimeDemoBlock>
    </section>
  );
}

function WeekDemo() {
  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">CalendarWeek</h2>
      <TimeDemoBlock title="Woche vom 16.11.2026 mit allen vier Arten" wide>
        <CalendarLegend label="Legende der Woche" items={legendItems} />
        <CalendarWeek date="2026-11-16" entries={demoEntries} locale="de-CH" label="Kalender, 16. bis 22. November 2026" labels={weekLabels} today={DEMO_TODAY} startHour={12} endHour={22} onEntrySelect={setSelected} />
        <p role="status" className="text-small text-ink-muted">
          {describeEntry(selected)}
        </p>
      </TimeDemoBlock>
      <TimeDemoBlock title="Abweichende Zeitzone des Betrachters" wide>
        <CalendarWeek date="2026-11-16" entries={demoEntries} locale="de-CH" label="Kalender mit Hinweis zur Zeitzone" labels={weekLabels} today={DEMO_TODAY} startHour={14} endHour={20} timeZoneNote={ZONE_NOTE} />
      </TimeDemoBlock>
      <TimeDemoBlock title="Leere Woche" wide>
        <CalendarWeek date="2026-11-09" entries={[]} locale="de-CH" label="Kalender, 9. bis 15. November 2026" labels={weekLabels} today={DEMO_TODAY} startHour={16} endHour={20} />
      </TimeDemoBlock>
    </section>
  );
}

function DayDemo() {
  const [date, setDate] = useState("2026-11-18");
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">CalendarDay</h2>
      <TimeDemoBlock title="Mit Wochenstreifen (Mobile)">
        <CalendarDay date={date} entries={demoEntries} locale="de-CH" labels={dayLabels} today={DEMO_TODAY} startHour={12} endHour={22} onDateChange={setDate} />
      </TimeDemoBlock>
      <TimeDemoBlock title="Überlappende Anfragen">
        <CalendarDay date="2026-11-19" entries={demoEntries} locale="de-CH" labels={dayLabels} today={DEMO_TODAY} startHour={14} endHour={19} weekStrip={false} />
      </TimeDemoBlock>
      <TimeDemoBlock title="Leerer Tag mit Hinweis zur Zeitzone">
        <CalendarDay date="2026-11-21" entries={demoEntries} locale="de-CH" labels={dayLabels} today={DEMO_TODAY} startHour={16} endHour={20} weekStrip={false} timeZoneNote={ZONE_NOTE} />
      </TimeDemoBlock>
    </section>
  );
}

function MonthDemo() {
  const [selected, setSelected] = useState<string | null>("2026-11-18");
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">CalendarMonth</h2>
      <TimeDemoBlock title="November 2026 mit Marken je Tag">
        <CalendarLegend label="Legende des Monats" items={legendItems} />
        <CalendarMonth month="2026-11" entries={demoEntries} locale="de-CH" label="November 2026" dayLabel={demoDayLabel} todayLabel="Heute" today={DEMO_TODAY} selectedDate={selected} onDateSelect={setSelected} />
        <p role="status" className="tabular text-small text-ink-muted">
          Gewählter Tag: {selected ?? "keiner"}
        </p>
      </TimeDemoBlock>
      <TimeDemoBlock title="Leerer Monat über den Jahreswechsel">
        <CalendarMonth month="2027-01" entries={[]} locale="de-CH" label="Januar 2027" dayLabel={demoDayLabel} todayLabel="Heute" today={DEMO_TODAY} />
      </TimeDemoBlock>
    </section>
  );
}
