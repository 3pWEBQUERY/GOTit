import { useId, type ReactNode } from "react";
import { UiLink } from "../../link/ui-link";

export interface FooterGroup {
  heading: string;
  links: readonly { label: string; href: string }[];
}

export interface FooterProps {
  label: string;
  groups: readonly FooterGroup[];
  /** Sprache und Darstellung. */
  controls: ReactNode;
  legalNote: string;
}

/** Footer des Marktplatz-Modus: Regionen, Sicherheit, Hilfe, Recht, Sprache, Darstellung (PRD 6.2). */
export function Footer({ label, groups, controls, legalNote }: FooterProps) {
  const id = useId();
  return (
    <footer aria-label={label} className="border-t border-border bg-surface-2">
      <div className="mx-auto grid max-w-content gap-8 px-4 py-12 xs:grid-cols-2 md:px-6 lg:grid-cols-[repeat(4,1fr)_auto]">
        {groups.map((group, index) => (
          <div key={group.heading}>
            <p id={`${id}-${index}`} className="mb-2 text-label text-ink-muted">
              {group.heading}
            </p>
            <ul aria-labelledby={`${id}-${index}`}>
              {group.links.map((link) => (
                <li key={link.href}>
                  <UiLink href={link.href} className="inline-flex min-h-9 items-center text-small text-ink hover:text-accent">
                    {link.label}
                  </UiLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex flex-col gap-4">{controls}</div>
      </div>
      <p className="mx-auto max-w-content px-4 pb-8 text-small text-ink-muted md:px-6">{legalNote}</p>
    </footer>
  );
}
