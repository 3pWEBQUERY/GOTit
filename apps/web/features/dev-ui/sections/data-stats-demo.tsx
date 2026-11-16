"use client";

import { RangePicker, StatFigure, type RangeValue } from "@app/ui";
import { useState } from "react";

const rangeLabels = {
  group: "Zeitraum",
  "7d": "7 Tage",
  "30d": "30 Tage",
  "90d": "90 Tage",
  custom: "Eigener Zeitraum",
  from: "Von",
  to: "Bis",
  date: {
    openCalendar: "Kalender öffnen",
    previousMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    invalidFormat: "Gib das Datum als TT.MM.JJJJ ein, zum Beispiel 16.11.2026.",
    outOfRange: "Dieser Tag liegt ausserhalb des wählbaren Zeitraums.",
  },
};

function describeRange(value: RangeValue): string {
  if (value.preset !== "custom") return rangeLabels[value.preset];
  return `${value.from || "offen"} bis ${value.to || "offen"}`;
}

/** StatFigure und RangePicker der Testseite «Daten». */
export function DataStatsDemo() {
  const [range, setRange] = useState<RangeValue>({ preset: "7d" });
  const [custom, setCustom] = useState<RangeValue>({ preset: "custom", from: "2026-11-01", to: "2026-11-15" });

  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">StatFigure</h2>
        <p className="max-w-prose text-small text-ink-muted">Alle Zahlen sind Beispielwerte. Höchstens vier Kennzahlen nebeneinander, jede mit Vergleich in Zahl und Wort.</p>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Mit Vergleich und Zeitraum</h3>
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 xs:grid-cols-2 lg:grid-cols-4">
            <StatFigure label="Profilaufrufe (Beispielwert)" value="412" comparison={{ text: "+12 % ggü. Vorwoche", direction: "up" }} period="Letzte 7 Tage" />
            <StatFigure label="Kontaktanfragen (Beispielwert)" value="18" comparison={{ text: "2 weniger als in der Vorwoche", direction: "down" }} period="Letzte 7 Tage" />
            <StatFigure label="Terminanfragen (Beispielwert)" value="7" comparison={{ text: "Gleich viele wie in der Vorwoche", direction: "flat" }} period="Letzte 7 Tage" />
            <StatFigure label="Neue Favoriten (Beispielwert)" value="9" comparison={{ text: "4 mehr als in der Vorwoche", direction: "up" }} period="Letzte 7 Tage" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Nur Wert</h3>
          <StatFigure label="Bestätigte Termine (Beispielwert)" value="3" className="max-w-panel" />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Noch kein Vergleich möglich</h3>
          <StatFigure label="Profilaufrufe (Beispielwert)" value="0" period="Seit heute. Ein Vergleich erscheint nach der ersten vollen Woche." className="max-w-panel" />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">RangePicker</h2>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Voreinstellung</h3>
          <RangePicker value={range} onValueChange={setRange} labels={rangeLabels} locale="de-CH" today="2026-11-16" max="2026-11-16" dateHint="Format: TT.MM.JJJJ" />
          <p role="status" className="tabular text-small text-ink-muted">
            Gewählt: {describeRange(range)}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Eigener Zeitraum</h3>
          <RangePicker
            value={custom}
            onValueChange={setCustom}
            labels={{ ...rangeLabels, group: "Zeitraum mit eigenen Daten" }}
            locale="de-CH"
            today="2026-11-16"
            max="2026-11-16"
            customDefault={{ from: "2026-11-01", to: "2026-11-15" }}
            dateHint="Format: TT.MM.JJJJ"
          />
          <p role="status" className="tabular text-small text-ink-muted">
            Gewählt: {describeRange(custom)}
          </p>
        </div>
      </section>
    </>
  );
}
