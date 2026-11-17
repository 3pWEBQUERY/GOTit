import type { ReactNode } from "react";

/** Angaben als Begriffsliste in zwei Spalten ab 768 px. */
export function Facts({ items, label }: { items: readonly { label: string; value: ReactNode }[]; label?: string }) {
  return (
    <dl aria-label={label} className="grid gap-x-6 gap-y-3 md:grid-cols-[minmax(10rem,auto)_1fr]">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-small text-ink-muted">{item.label}</dt>
          <dd className="min-w-0 text-body break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Abschnitt einer Detailseite mit Überschrift der zweiten Ebene. */
export function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4 border-t border-border pt-6">
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      {intro ? <p className="max-w-prose text-small text-ink-muted">{intro}</p> : null}
      {children}
    </section>
  );
}
