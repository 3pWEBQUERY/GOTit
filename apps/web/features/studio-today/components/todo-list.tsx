import type { ReactNode } from "react";

export interface TodoEntry {
  id: string;
  text: string;
  action?: ReactNode;
}

/** «Zu erledigen»: nach Dringlichkeit sortierte Liste. Ist nichts offen, steht dort ein Satz (PRD 11.1). */
export function TodoList({ heading, entries, emptyText }: { heading: string; entries: readonly TodoEntry[]; emptyText: string }) {
  return (
    <section aria-labelledby="todo-heading" className="rounded-card border border-border bg-surface p-4 md:p-6">
      <h2 id="todo-heading" className="mb-3 text-h2">
        {heading}
      </h2>
      {entries.length === 0 ? (
        <p className="text-body text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <li key={entry.id} className="flex min-h-11 flex-wrap items-center justify-between gap-3 py-2 text-body">
              {entry.text}
              {entry.action}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
