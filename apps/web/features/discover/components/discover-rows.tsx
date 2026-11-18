import type { SearchHit } from "@app/core/search";
import { UiLink } from "@app/ui";
import { SearchHitCard } from "../../search/components/search-hit-card";

export const linkClass =
  "inline-flex min-h-11 items-center text-body text-ink underline underline-offset-4 hover:text-accent";

export interface DiscoverRow {
  id: string;
  title: string;
  hits: SearchHit[];
  more: { label: string; href: string } | null;
}

/** Eine Reihe von Entdecken: Überschrift, «Alle ansehen» und bis zu 10 Karten (PRD v2 9.1). */
export function DiscoverRowSection({
  row,
  profileHref,
  hearted,
  signInHref,
  priority = false,
}: {
  row: DiscoverRow;
  profileHref: (slug: string) => string;
  hearted: ReadonlySet<string>;
  signInHref: string | null;
  /** Erste Reihe der Seite: Bilder der ersten Karten sofort laden (LCP). */
  priority?: boolean;
}) {
  return (
    <section aria-labelledby={`row-${row.id}`} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id={`row-${row.id}`} className="text-h2">
          {row.title}
        </h2>
        {row.more ? (
          <UiLink href={row.more.href} className={linkClass}>
            {row.more.label}
          </UiLink>
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {row.hits.map((hit, index) => (
          <li key={hit.slug}>
            <SearchHitCard
              hit={hit}
              href={profileHref(hit.slug)}
              favorite={hearted.has(hit.slug)}
              signInHref={signInHref}
              priority={priority && index < 5}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Regionen als Linkliste am Ende von Entdecken, kein Bildraster (PRD v2 9.1). */
export function DiscoverRegionLinks({
  title,
  links,
}: {
  title: string;
  links: readonly { key: string; label: string; href: string }[];
}) {
  return (
    <nav
      aria-labelledby="discover-regions"
      className="border-t border-border pt-6"
    >
      <h2 id="discover-regions" className="mb-2 text-h2">
        {title}
      </h2>
      <ul className="flex flex-wrap gap-x-4">
        {links.map((link) => (
          <li key={link.key}>
            <UiLink href={link.href} className={linkClass}>
              {link.label}
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const chipClass =
  "inline-flex min-h-11 shrink-0 items-center rounded-full border border-border-strong bg-surface px-4 text-small font-[550] whitespace-nowrap text-ink transition-colors duration-state hover:bg-surface-2";

/** Schnellfilter als Links auf `/suche`: Sie wechseln die Seite, darum keine Schalter. */
export function DiscoverQuickLinks({
  label,
  links,
}: {
  label: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <nav
      aria-label={label}
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0"
    >
      <ul className="flex flex-nowrap gap-2 p-1">
        {links.map((link) => (
          <li key={link.href}>
            <UiLink href={link.href} className={chipClass}>
              {link.label}
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
