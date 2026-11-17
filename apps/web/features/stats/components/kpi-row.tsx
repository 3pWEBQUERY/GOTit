"use client";

import { StatFigure, type StatComparison } from "@app/ui";

export interface KpiItem {
  key: string;
  label: string;
  value: string;
  comparison: StatComparison;
}

/** Höchstens vier Kennzahlen nebeneinander, auf Mobile zwei pro Zeile (PRD v2 11.1). */
export function KpiRow({
  items,
  footnote,
}: {
  items: readonly KpiItem[];
  footnote?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 xs:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.key} data-kpi={item.key} className="min-w-0">
            <StatFigure
              label={item.label}
              value={item.value}
              comparison={item.comparison}
            />
          </div>
        ))}
      </div>
      {footnote ? (
        <p className="max-w-prose text-small text-ink-muted">{footnote}</p>
      ) : null}
    </div>
  );
}
