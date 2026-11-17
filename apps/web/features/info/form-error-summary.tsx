"use client";

import { InlineAlert } from "@app/ui";

/** Fehler oben im Formular mit Sprunglinks zu den Feldern (PRD 13). */
export function FormErrorSummary({ title, items }: { title: string; items: readonly { id: string; message: string }[] }) {
  if (items.length === 0) return null;
  return (
    <InlineAlert tone="error" title={title}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-ink underline underline-offset-2"
              onClick={(event) => {
                event.preventDefault();
                const element = document.getElementById(item.id);
                (element?.matches("input,textarea,button") ? element : element?.querySelector<HTMLElement>("input,textarea,button,[role=radio]"))?.focus();
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
