"use client";

import { BarChart, LineChart } from "@app/ui";

const number = new Intl.NumberFormat("de-CH");
const formatValue = (value: number) => number.format(value);

const viewsPerDay = [
  { label: "10.11.", value: 48 },
  { label: "11.11.", value: 61 },
  { label: "12.11.", value: 55 },
  { label: "13.11.", value: 72 },
  { label: "14.11.", value: 80 },
  { label: "15.11.", value: 58 },
  { label: "16.11.", value: 38 },
];

const funnel = [
  { label: "Einblendungen in der Suche", value: 3200, note: "100 %" },
  { label: "Profilaufrufe", value: 412, note: "13 %" },
  { label: "Kontaktaktionen", value: 31, note: "8 %" },
  { label: "Terminanfragen", value: 7, note: "23 %" },
  { label: "Bestätigte Termine", value: 3, note: "43 %" },
];

const requestsPerWeekday = [
  { label: "Mo", value: 2 },
  { label: "Di", value: 4 },
  { label: "Mi", value: 3 },
  { label: "Do", value: 6 },
  { label: "Fr", value: 9 },
  { label: "Sa", value: 7 },
  { label: "So", value: 1 },
];

const dayTable = { show: "Als Tabelle anzeigen", hide: "Als Grafik anzeigen", labelColumn: "Tag", valueColumn: "Profilaufrufe" };
const funnelTable = { show: "Als Tabelle anzeigen", hide: "Als Grafik anzeigen", labelColumn: "Schritt", valueColumn: "Anzahl", noteColumn: "Anteil am Schritt davor" };
const weekdayTable = { show: "Als Tabelle anzeigen", hide: "Als Grafik anzeigen", labelColumn: "Wochentag", valueColumn: "Kontaktanfragen" };

/** LineChart und BarChart der Testseite «Daten». */
export function DataChartsDemo() {
  return (
    <>
      <section className="flex flex-col gap-8">
        <h2 className="text-h2">LineChart</h2>
        <p className="max-w-prose text-small text-ink-muted">Alle Zahlen sind Beispielwerte. Jede Grafik lässt sich als Tabelle derselben Daten anzeigen.</p>
        <LineChart
          title="Profilaufrufe pro Tag (Beispielwerte)"
          data={viewsPerDay}
          formatValue={formatValue}
          emptyText="Noch keine Daten für diesen Zeitraum"
          footnote="Gezählt wird jeder Aufruf deines Profils, höchstens einer pro Besuch. Einzelne Besucher werden nie gezeigt."
          tableLabels={dayTable}
        />
        <LineChart
          title="Profilaufrufe pro Tag, ohne Daten"
          data={[]}
          formatValue={formatValue}
          emptyText="Noch keine Daten für diesen Zeitraum"
          footnote="Gezählt wird jeder Aufruf deines Profils, höchstens einer pro Besuch."
          tableLabels={dayTable}
        />
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="text-h2">BarChart</h2>
        <BarChart
          layout="horizontal"
          title="Von der Suche zum Termin (Beispielwerte)"
          data={funnel}
          formatValue={formatValue}
          emptyText="Noch keine Daten für diesen Zeitraum"
          footnote="Jede Quote ist der Anteil am Schritt davor. Eine Einblendung zählt, sobald deine Karte in den Suchergebnissen sichtbar war."
          tableLabels={funnelTable}
        />
        <BarChart
          title="Kontaktanfragen nach Wochentag (Beispielwerte)"
          data={requestsPerWeekday}
          formatValue={formatValue}
          emptyText="Noch keine Daten für diesen Zeitraum"
          footnote="Gezählt wird der Tag, an dem die Anfrage einging."
          tableLabels={weekdayTable}
        />
        <BarChart
          layout="horizontal"
          title="Von der Suche zum Termin, ohne Daten"
          data={[]}
          formatValue={formatValue}
          emptyText="Noch keine Daten für diesen Zeitraum"
          footnote="Jede Quote ist der Anteil am Schritt davor."
          tableLabels={funnelTable}
        />
      </section>
    </>
  );
}
