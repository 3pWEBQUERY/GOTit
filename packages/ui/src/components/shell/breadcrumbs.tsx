import { ChevronRight } from "lucide-react";
import { UiLink } from "../../link/ui-link";

export interface Crumb {
  label: string;
  /** Der letzte Eintrag ist die aktuelle Seite und hat keinen Link. */
  href?: string;
}

/** Breadcrumbs ab der zweiten Ebene, nur auf Desktop; auf Mobile ersetzt sie der Zurück-Titel (PRD 8.2). */
export function Breadcrumbs({ label, items }: { label: string; items: readonly Crumb[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={label} className="hidden md:block">
      <ol className="flex flex-wrap items-center gap-1 text-small text-ink-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${item.href ?? "current"}`} className="inline-flex items-center gap-1">
              {item.href && !last ? (
                <UiLink href={item.href} className="inline-flex min-h-9 items-center hover:text-ink">
                  {item.label}
                </UiLink>
              ) : (
                <span aria-current={last ? "page" : undefined} className="text-ink">
                  {item.label}
                </span>
              )}
              {last ? null : <ChevronRight aria-hidden strokeWidth={1.5} className="size-4" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
