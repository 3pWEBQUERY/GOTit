"use client";

import { InlineAlert, UiLink } from "@app/ui";
import { useTranslations } from "next-intl";
import { focusField } from "../lib/focus-field";

export interface ErrorSummaryItem {
  /** ID des Felds, zu dem der Sprunglink führt. */
  fieldId: string;
  message: string;
}

/** Zusammenfassung der Fehler über dem Formular, mit Sprunglinks zu den Feldern (PRD 13). */
export function ErrorSummary({ items }: { items: readonly ErrorSummaryItem[] }) {
  const t = useTranslations("auth.form");
  if (items.length === 0) return null;
  return (
    <InlineAlert tone="error" title={t("summaryTitle", { count: items.length })}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.fieldId}>
            <UiLink
              href={`#${item.fieldId}`}
              className="text-ink underline underline-offset-2"
              onClick={(event) => {
                event.preventDefault();
                focusField(item.fieldId);
              }}
            >
              {item.message}
            </UiLink>
          </li>
        ))}
      </ul>
    </InlineAlert>
  );
}
