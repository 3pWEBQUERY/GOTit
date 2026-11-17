import { Button, UiLink } from "@app/ui";
import type { ReactNode } from "react";

/**
 * Filter einer Tabelle als GET-Formular: Suche und Filter stehen in der URL
 * (PRD 13 «Tabellen») und funktionieren ohne JavaScript.
 */
export function FilterBar({ action, label, submitLabel, resetLabel, resetHref, active, children }: { action: string; label: string; submitLabel: string; resetLabel: string; resetHref: string; active: boolean; children: ReactNode }) {
  return (
    <form method="get" action={action} role="search" aria-label={label} className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
      {children}
      <Button type="submit" variant="secondary">
        {submitLabel}
      </Button>
      {active ? (
        <Button asChild variant="quiet">
          <UiLink href={resetHref}>{resetLabel}</UiLink>
        </Button>
      ) : null}
    </form>
  );
}

/** Weiter blättern über einen Cursor; zurück geht es zur ersten Seite. */
export function CursorPager({ nextHref, firstHref, nextLabel, firstLabel }: { nextHref: string | null; firstHref: string | null; nextLabel: string; firstLabel: string }) {
  if (!nextHref && !firstHref) return null;
  return (
    <nav aria-label={nextLabel} className="flex flex-wrap gap-3">
      {firstHref ? (
        <Button asChild variant="quiet">
          <UiLink href={firstHref}>{firstLabel}</UiLink>
        </Button>
      ) : null}
      {nextHref ? (
        <Button asChild variant="secondary">
          <UiLink href={nextHref} rel="next">
            {nextLabel}
          </UiLink>
        </Button>
      ) : null}
    </nav>
  );
}

/** Baut eine Adresse mit Suchparametern; leere Werte fallen weg. */
export function withQuery(path: string, query: Record<string, string | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
