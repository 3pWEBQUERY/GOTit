"use client";

import { DataTable, UiLink, type DataTableColumn } from "@app/ui";
import type { ReactNode } from "react";

export interface OrganizationQueueRow {
  id: string;
  href: string;
  name: string;
  kindLabel: string;
  legalName: string;
  uid: string;
  submittedIso: string;
  submittedLabel: string;
  ageLabel: string;
}

export interface OrganizationQueueLabels {
  caption: string;
  name: string;
  kind: string;
  legalName: string;
  uid: string;
  submitted: string;
  age: string;
}

/** Eingereichte Nachweise als dichte Tabelle (v2 12.4), älteste zuerst. */
export function OrganizationQueueTable({
  rows,
  labels,
  empty,
}: {
  rows: readonly OrganizationQueueRow[];
  labels: OrganizationQueueLabels;
  empty: ReactNode;
}) {
  const columns: DataTableColumn<OrganizationQueueRow>[] = [
    {
      id: "organisation",
      header: labels.name,
      priority: 1,
      cell: (row) => (
        <UiLink
          href={row.href}
          className="font-[550] break-words text-ink underline-offset-4 hover:underline"
          data-organization-case-link={row.id}
        >
          {row.name}
        </UiLink>
      ),
    },
    { id: "art", header: labels.kind, cell: (row) => row.kindLabel },
    {
      id: "firma",
      header: labels.legalName,
      priority: 2,
      cell: (row) => row.legalName,
    },
    {
      id: "uid",
      header: labels.uid,
      cell: (row) => <span className="tabular">{row.uid}</span>,
    },
    {
      id: "eingereicht",
      header: labels.submitted,
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
      empty={empty}
    />
  );
}
