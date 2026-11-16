import type { ReactNode } from "react";

/** Ein Teil eines Abschnitts mit h2, getrennt durch eine Linie statt einer Karte. */
export function SettingsBlock({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-h2">
          {title}
        </h2>
        {intro ? <p className="max-w-prose text-small text-ink-muted">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}
