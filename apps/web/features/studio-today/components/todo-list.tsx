import type { ReactNode } from "react";

export interface TodoEntry {
  id: string;
  text: string;
  /** Ein erklärender Satz unter dem Text. */
  hint?: string;
  action?: ReactNode;
  /** Einzelne Fälle unter dem Eintrag, zum Beispiel die offenen Anfragen. */
  items?: readonly { id: string; content: ReactNode }[];
}

/** «Zu erledigen»: nach Dringlichkeit sortierte Liste. Ist nichts offen, steht dort ein Satz (PRD 11.1). */
export function TodoList({
  heading,
  entries,
  emptyText,
}: {
  heading: string;
  entries: readonly TodoEntry[];
  emptyText: string;
}) {
  return (
    <section
      aria-labelledby="todo-heading"
      className="rounded-card border border-border bg-surface p-4 md:p-6"
    >
      <h2 id="todo-heading" className="mb-3 text-h2">
        {heading}
      </h2>
      {entries.length === 0 ? (
        <p className="text-body text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <li
              key={entry.id}
              data-todo={entry.id}
              className="flex flex-col gap-2 py-2 text-body"
            >
              <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
                {entry.hint ? (
                  <span className="flex min-w-0 flex-col gap-1">
                    <span>{entry.text}</span>
                    <span className="text-small text-ink-muted">
                      {entry.hint}
                    </span>
                  </span>
                ) : (
                  <span className="min-w-0">{entry.text}</span>
                )}
                {entry.action}
              </div>
              {entry.items && entry.items.length > 0 ? (
                <ul className="flex flex-col gap-1 pl-4 text-small">
                  {entry.items.map((item) => (
                    <li key={item.id}>{item.content}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
