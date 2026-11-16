"use client";

import { ChartNoAxesColumn, Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { ChartTable, type ChartDatum } from "./chart-table";

export interface ChartTableLabels {
  /** Text des Umschalters in der Grafikansicht, zum Beispiel «Als Tabelle anzeigen». */
  show: string;
  /** Text des Umschalters in der Tabellenansicht, zum Beispiel «Als Grafik anzeigen». */
  hide: string;
  /** Kopf der ersten Spalte, zum Beispiel «Tag». */
  labelColumn: string;
  /** Kopf der Wertspalte, zum Beispiel «Profilaufrufe». Benennt auch den Wert im Tooltip. */
  valueColumn: string;
  /** Kopf der Spalte für Zusätze wie Quoten. */
  noteColumn?: string;
}

/** Props, die `LineChart` und `BarChart` teilen. */
export interface ChartBaseProps {
  /** Überschrift der Grafik und Name ihrer Tabelle. */
  title: ReactNode;
  titleAs?: "h2" | "h3" | "h4";
  data: readonly ChartDatum[];
  /** Formatiert Werte für Achse, Tooltip und Tabelle. */
  formatValue: (value: number) => string;
  /** Satz für den Leerzustand, zum Beispiel «Noch keine Daten für diesen Zeitraum». */
  emptyText: ReactNode;
  /** Wie die Zahl gezählt wird. */
  footnote: ReactNode;
  tableLabels: ChartTableLabels;
  className?: string;
}

export interface ChartFrameProps extends ChartBaseProps {
  /** Höhe der Zeichenfläche in Pixeln. */
  height: number;
  /** Die Zeichnung; sie ist für Screenreader ausgeblendet, die Tabelle ersetzt sie. */
  children: ReactNode;
}

/**
 * Rahmen jeder Grafik (PRD 11.6): Überschrift, Umschalter zur Tabellenansicht
 * derselben Daten, Leerzustand statt leerer Achsen und die Fussnote.
 */
export function ChartFrame({ title, titleAs: Heading = "h3", data, formatValue, emptyText, footnote, tableLabels, height, className, children }: ChartFrameProps) {
  const titleId = useId();
  const [view, setView] = useState<"chart" | "table">("chart");
  const empty = data.length === 0;

  return (
    <section aria-labelledby={titleId} data-view={empty ? "empty" : view} className={cn("flex min-w-0 flex-col gap-3 text-ink", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Heading id={titleId} className="text-h3">
          {title}
        </Heading>
        {empty ? null : (
          <Button
            variant="quiet"
            icon={view === "chart" ? <Table2 aria-hidden strokeWidth={1.5} /> : <ChartNoAxesColumn aria-hidden strokeWidth={1.5} />}
            onClick={() => setView(view === "chart" ? "table" : "chart")}
          >
            {view === "chart" ? tableLabels.show : tableLabels.hide}
          </Button>
        )}
      </div>
      {empty ? (
        <p className="border-y border-border py-8 text-body text-ink-muted">{emptyText}</p>
      ) : (
        <>
          {view === "chart" ? (
            <div aria-hidden data-chart-canvas className="tabular min-w-0 text-small" style={{ height }}>
              {children}
            </div>
          ) : null}
          <ChartTable caption={title} data={data} formatValue={formatValue} labelColumn={tableLabels.labelColumn} valueColumn={tableLabels.valueColumn} noteColumn={tableLabels.noteColumn} visible={view === "table"} />
        </>
      )}
      <p className="max-w-prose text-small text-ink-muted">{footnote}</p>
    </section>
  );
}
