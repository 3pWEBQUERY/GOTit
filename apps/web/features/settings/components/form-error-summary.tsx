"use client";

import { InlineAlert, UiLink } from "@app/ui";

export interface SummaryEntry {
  fieldId: string;
  message: string;
}

/** Fehler zusammengefasst über dem Formular, mit Sprunglinks zu den Feldern (PRD 13). */
export function FormErrorSummary({ title, entries, formError }: { title: string; entries: readonly SummaryEntry[]; formError?: string | null }) {
  if (entries.length === 0 && !formError) return null;
  return (
    <InlineAlert tone="error" title={formError ?? title}>
      {entries.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {entries.map((entry) => (
            <li key={entry.fieldId}>
              <UiLink href={`#${entry.fieldId}`} className="underline underline-offset-4 hover:text-ink">
                {entry.message}
              </UiLink>
            </li>
          ))}
        </ul>
      ) : null}
    </InlineAlert>
  );
}
