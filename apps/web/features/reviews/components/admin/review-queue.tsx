"use client";

import {
  DataTable,
  UiLink,
  type DataTableColumn,
  type DataTableSort,
} from "@app/ui";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { queueSortQuery } from "../../../admin/queue/queue-sort";

export interface ReviewQueueRow {
  id: string;
  href: string;
  kindLabel: string;
  profileName: string;
  submittedIso: string;
  submittedLabel: string;
  ageLabel: string;
}

export interface ReviewQueueLabels {
  caption: string;
  kind: string;
  profile: string;
  submitted: string;
  age: string;
}

/**
 * Bewertungen und Einsprüche als dichte Tabelle (v2 12.4), ohne Text und ohne
 * Autor. Vorausladen erreicht nur das Layout des Falls, das ohne Audit-Eintrag
 * prüft; erst das Öffnen schreibt einen.
 */
export function ReviewQueueTable({
  rows,
  sort,
  labels,
  empty,
}: {
  rows: readonly ReviewQueueRow[];
  sort: DataTableSort;
  labels: ReviewQueueLabels;
  empty: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const columns: DataTableColumn<ReviewQueueRow>[] = [
    {
      id: "art",
      header: labels.kind,
      priority: 1,
      cell: (row) => (
        <UiLink
          href={row.href}
          className="font-[550] text-ink underline-offset-4 hover:underline"
          data-review-case-link={row.id}
        >
          {row.kindLabel}
        </UiLink>
      ),
    },
    {
      id: "profil",
      header: labels.profile,
      priority: 2,
      cell: (row) => row.profileName,
    },
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
        <time
          dateTime={row.submittedIso}
          title={row.submittedLabel}
          className="tabular"
        >
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
      onSortChange={(next) =>
        router.replace(`${pathname}${queueSortQuery(next)}`, { scroll: false })
      }
      empty={empty}
    />
  );
}
