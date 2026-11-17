"use client";

import { DataTable, UiLink, type DataTableColumn, type DataTableSort } from "@app/ui";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { queueSortQuery } from "../queue/queue-sort";

export interface MediaQueueRow {
  id: string;
  href: string;
  label: string;
  submittedIso: string;
  submittedLabel: string;
  ageLabel: string;
  visibilityLabel: string;
}

/** Warteschlange der Medien als dichte Tabelle; ohne Vorschau, damit nichts versehentlich sichtbar wird (PRD v2 12.4). */
export function MediaQueueTable({ rows, sort, labels, empty }: { rows: readonly MediaQueueRow[]; sort: DataTableSort; labels: { caption: string; profile: string; submitted: string; age: string; visibility: string }; empty: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const columns: DataTableColumn<MediaQueueRow>[] = [
    {
      id: "profil",
      header: labels.profile,
      priority: 1,
      cell: (row) => (
        <UiLink href={row.href} className="font-[550] text-ink underline-offset-4 hover:underline" data-media-case-link={row.id}>
          {row.label}
        </UiLink>
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
    { id: "sichtbarkeit", header: labels.visibility, cell: (row) => row.visibilityLabel },
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
