"use client";

import { DataTable, UiLink, type DataTableColumn, type DataTableSort } from "@app/ui";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { queueSortQuery } from "./queue-sort";

export interface QueueRow {
  id: string;
  href: string;
  /** «Änderung» bei einer Änderung an einem veröffentlichten Profil; null bei einer Erstprüfung. */
  kindLabel: string | null;
  displayName: string;
  submittedIso: string;
  submittedLabel: string;
  ageLabel: string;
  assigneeLabel: string;
}

export interface QueueTableProps {
  rows: readonly QueueRow[];
  sort: DataTableSort;
  labels: { caption: string; displayName: string; submitted: string; age: string; assignee: string };
  empty: ReactNode;
}

/** Warteschlange als dichte Tabelle (40-px-Zeilen); die Sortierung steht in der URL (PRD 13). */
export function QueueTable({ rows, sort, labels, empty }: QueueTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const columns: DataTableColumn<QueueRow>[] = [
    {
      id: "anzeigename",
      header: labels.displayName,
      priority: 1,
      cell: (row) => (
        <span className="inline-flex flex-wrap items-baseline gap-x-2">
          <UiLink href={row.href} className="font-[550] text-ink underline-offset-4 hover:underline" data-case-link={row.id}>
            {row.displayName}
          </UiLink>
          {row.kindLabel ? (
            <span data-case-kind className="rounded-chip border border-border px-1 text-small text-ink">
              {row.kindLabel}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "eingereicht",
      header: labels.submitted,
      sortable: true,
      priority: 3,
      cell: (row) => (
        <time dateTime={row.submittedIso} className="tabular">
          {row.submittedLabel}
        </time>
      ),
    },
    {
      id: "alter",
      header: labels.age,
      priority: 2,
      cell: (row) => (
        <time dateTime={row.submittedIso} title={row.submittedLabel} className="tabular">
          {row.ageLabel}
        </time>
      ),
    },
    { id: "zustaendig", header: labels.assignee, cell: (row) => row.assigneeLabel },
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
