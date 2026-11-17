"use client";

import { DataTable, type DataTableColumn } from "@app/ui";
import { useLocale } from "next-intl";
import { useId, type ReactNode } from "react";
import type { MediaRow, SearchRow } from "../queries/load-stats";

export interface TableTexts {
  title: string;
  emptyText: string;
  footnote: string;
  labelColumn: string;
  valueColumn: string;
}

function TableSection({
  texts,
  kind,
  children,
}: {
  texts: TableTexts;
  kind: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      data-stats-table={kind}
      className="flex min-w-0 flex-col gap-3"
    >
      <h2 id={titleId} className="text-h3">
        {texts.title}
      </h2>
      {children}
      <p className="max-w-prose text-small text-ink-muted">{texts.footnote}</p>
    </section>
  );
}

const empty = (text: string) => (
  <p className="py-6 text-body text-ink-muted">{text}</p>
);

/** «Suchen, in denen du erschienst»: die Filter in Worten und die Einblendungen (PRD v2 11.6). */
export function SearchesTable({
  rows,
  texts,
}: {
  rows: readonly SearchRow[];
  texts: TableTexts;
}) {
  const format = new Intl.NumberFormat(`${useLocale()}-CH`);
  const columns: DataTableColumn<SearchRow>[] = [
    {
      id: "suche",
      header: texts.labelColumn,
      priority: 1,
      cell: (row) => row.description,
    },
    {
      id: "einblendungen",
      header: texts.valueColumn,
      align: "end",
      priority: 2,
      cell: (row) => (
        <span className="tabular">{format.format(row.impressions)}</span>
      ),
    },
  ];
  return (
    <TableSection texts={texts} kind="searches">
      <DataTable
        caption={texts.title}
        captionHidden
        columns={columns}
        rows={rows}
        getRowId={(row) => row.key || "ohne-filter"}
        empty={empty(texts.emptyText)}
      />
    </TableSection>
  );
}

/** «Medien nach Aufrufen»: Vorschaubild, Alternativtext und Aufrufe (PRD v2 11.6). */
export function MediaTable({
  rows,
  texts,
  noAlt,
}: {
  rows: readonly MediaRow[];
  texts: TableTexts;
  noAlt: string;
}) {
  const format = new Intl.NumberFormat(`${useLocale()}-CH`);
  const columns: DataTableColumn<MediaRow>[] = [
    {
      id: "medium",
      header: texts.labelColumn,
      priority: 1,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- Varianten kommen fertig aus /media; der Text daneben benennt das Bild, es bleibt stumm */}
          <img
            src={row.src}
            alt=""
            width={48}
            height={60}
            loading="lazy"
            className="h-15 w-12 shrink-0 rounded-chip bg-surface-2 object-cover"
          />
          <span
            className={
              row.alt ? "min-w-0 break-words" : "min-w-0 text-ink-muted"
            }
          >
            {row.alt ?? noAlt}
          </span>
        </span>
      ),
    },
    {
      id: "aufrufe",
      header: texts.valueColumn,
      align: "end",
      priority: 2,
      cell: (row) => (
        <span className="tabular">{format.format(row.views)}</span>
      ),
    },
  ];
  return (
    <TableSection texts={texts} kind="media">
      <DataTable
        caption={texts.title}
        captionHidden
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        empty={empty(texts.emptyText)}
      />
    </TableSection>
  );
}
