"use client";

import type { ReportPriority } from "@app/db";
import { DataTable, UiLink, type DataTableColumn, type DataTableSort } from "@app/ui";
import { Scale } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { PriorityBadge } from "./priority-badge";

export interface ModerationQueueRow {
  id: string;
  href: string;
  caseId: string;
  category: string;
  priority: ReportPriority;
  priorityLabel: string;
  statusLabel: string;
  appealOpen: boolean;
  assignee: string;
  submittedIso: string;
  submittedLabel: string;
  ageLabel: string;
}

export interface ModerationQueueLabels {
  caption: string;
  caseId: string;
  category: string;
  priority: string;
  status: string;
  assignee: string;
  age: string;
  appealOpen: string;
}

/**
 * Fälle als dichte Tabelle mit 40 px Zeilen (v2 12.4), ohne Inhalte. Die
 * Reihenfolge kommt vom Kern: Priorität, darin das Alter. «Alter» kehrt nur
 * die Reihenfolge innerhalb einer Priorität um. Vorausladen erreicht nur das
 * Layout des Falls, das ohne Audit-Eintrag prüft.
 */
export function ModerationQueueTable({ rows, sort, labels, empty }: { rows: readonly ModerationQueueRow[]; sort: DataTableSort; labels: ModerationQueueLabels; empty: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const columns: DataTableColumn<ModerationQueueRow>[] = [
    {
      id: "fall",
      header: labels.caseId,
      priority: 1,
      cell: (row) => (
        <UiLink href={row.href} className="tabular font-[550] text-ink underline-offset-4 hover:underline" data-case-link={row.id}>
          {row.caseId}
        </UiLink>
      ),
    },
    { id: "kategorie", header: labels.category, priority: 2, cell: (row) => row.category },
    { id: "prioritaet", header: labels.priority, priority: 2, cell: (row) => <PriorityBadge priority={row.priority} label={row.priorityLabel} /> },
    {
      id: "status",
      header: labels.status,
      priority: 3,
      cell: (row) => (
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <span>{row.statusLabel}</span>
          {row.appealOpen ? (
            <span className="inline-flex items-center gap-1 text-small font-[550] text-ink" data-appeal-open>
              <Scale aria-hidden strokeWidth={1.5} className="size-4" />
              {labels.appealOpen}
            </span>
          ) : null}
        </span>
      ),
    },
    { id: "zustaendig", header: labels.assignee, priority: 3, cell: (row) => row.assignee },
    {
      id: "alter",
      header: labels.age,
      sortable: true,
      cell: (row) => (
        <time dateTime={row.submittedIso} title={row.submittedLabel} className="tabular whitespace-nowrap">
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
      onSortChange={(next) => {
        const query = new URLSearchParams(search.toString());
        if (next.direction === "desc") query.set("richtung", "ab");
        else query.delete("richtung");
        const text = query.toString();
        router.replace(`${pathname}${text ? `?${text}` : ""}`, { scroll: false });
      }}
      empty={empty}
    />
  );
}
