import { UiLink } from "@app/ui";
import { ChevronRight } from "lucide-react";

/** Kurzlinks als Liste mit Pfeil; auf Mobile auch die erste Stufe der Einstellungen (PRD 12.1). */
export function LinkList({ id, title, links }: { id: string; title: string; links: readonly { key: string; href: string; label: string }[] }) {
  return (
    <nav id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-24 flex-col gap-2 border-t border-border pt-6">
      <h2 id={`${id}-title`} className="text-h2">
        {title}
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {links.map((link) => (
          <li key={link.key}>
            <UiLink href={link.href} className="flex min-h-11 items-center justify-between gap-3 py-2 text-body text-ink hover:text-accent">
              {link.label}
              <ChevronRight aria-hidden strokeWidth={1.5} className="size-[1.125rem] shrink-0 text-ink-muted" />
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
