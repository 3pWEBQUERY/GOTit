"use client";

import { DataTable, UiLink, type DataTableColumn, type DataTableSort } from "@app/ui";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { queueSortQuery } from "../queue/queue-sort";
import { UrgentBadge } from "./urgent-badge";

export interface ReportQueueRow {
  id: string;
  href: string;
  urgent: boolean;
  reasonLabel: string;
  targetLabel: string;
  submittedIso: string;
  submittedLabel: string;
  ageLabel: string;
}

export interface ReportQueueLabels {
  caption: string;
  priority: string;
  reason: string;
  target: string;
  submitted: string;
  age: string;
  urgent: string;
  normal: string;
}

/**
 * Meldungen als dichte Tabelle (PRD v2 12.4), ohne Inhalte. Vorausladen
 * erreicht nur das Layout des Falls, das ohne Audit-Eintrag prüft; erst das
 * Öffnen schreibt einen.
 */
export function ReportQueueTable({ rows, sort, labels, empty }: { rows: readonly ReportQueueRow[]; sort: DataTableSort; labels: ReportQueueLabels; empty: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const columns: DataTableColumn<ReportQueueRow>[] = [
    {
      id: "prioritaet",
      header: labels.priority,
      priority: 2,
      cell: (row) => (row.urgent ? <UrgentBadge label={labels.urgent} /> : <span className="text-small text-ink-muted">{labels.normal}</span>),
    },
    {
      id: "grund",
      header: labels.reason,
      priority: 1,
      cell: (row) => (
        <UiLink href={row.href} className="font-[550] text-ink underline-offset-4 hover:underline" data-report-link={row.id}>
          {row.reasonLabel}
        </UiLink>
      ),
    },
    { id: "gegenstand", header: labels.target, priority: 3, cell: (row) => row.targetLabel },
    {
      id: "eingereicht",
      header: labels.submitted,
      sortable: true,
      cell: (row) => (
        <time dateTime={row.submittedIso} className="tabular">
          {row.submittedLabel}
        </time>
      ),
    },
    {
      id: "alter",
      header: labels.age,
      cell: (row) => (
        <time dateTime={row.submittedIso} title={row.submittedLabel} className="tabular">
          {row.ageLabel}
        </time>
      ),
    },
  ];
  return (
    <DataTable
      caption={labels.caption}
      captionHidden
      density="compact"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      sort={sort}
      onSortChange={(next) => router.replace(`${pathname}${queueSortQuery(next)}`, { scroll: false })}
      empty={empty}
    />
  );
}
