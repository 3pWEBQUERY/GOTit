"use client";

import { InlineAlert } from "@app/ui";
import { useTranslations } from "next-intl";

/** Fehler zusammengefasst über dem Formular, mit Sprunglinks zu den Feldern (PRD 13). */
export function ErrorSummary({
  items,
}: {
  items: readonly { fieldId: string; message: string }[];
}) {
  const t = useTranslations("organization.form");
  if (items.length === 0) return null;
  return (
    <InlineAlert
      tone="error"
      title={t("summaryTitle", { count: items.length })}
    >
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.fieldId}>
            <a
              href={`#${item.fieldId}`}
              className="text-ink underline underline-offset-2"
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(item.fieldId)?.focus();
              }}
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </InlineAlert>
  );
}
