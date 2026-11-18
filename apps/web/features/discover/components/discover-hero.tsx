import { CalendarCheck, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { cn, UiLink } from "@app/ui";
import type { CSSProperties, ReactNode } from "react";

export interface HeroCover {
  src: string;
  /** Dominante Farbe des Bilds; füllt die Fläche, solange es lädt. */
  color: string | null;
}

export interface DiscoverHeroProps {
  eyebrow: string;
  title: string;
  lead: string;
  /** «Region ändern», oben rechts. */
  regionMenu: ReactNode;
  search: ReactNode;
  quickLinks: ReactNode;
  features: { label: string; identity: string; booking: string; messenger: string; reviews: string };
  /** Titelbilder freigegebener Profile der Region (Entscheid 0025), höchstens drei. */
  covers: readonly HeroCover[];
}

function Cover({ cover, className }: { cover: HeroCover; className?: string }) {
  // Einzige Inline-Farbe: Datenwert des Bilds, kein Gestaltungswert.
  const style: CSSProperties | undefined = cover.color ? { backgroundColor: cover.color } : undefined;
  return (
    <div className={cn("overflow-hidden rounded-card bg-surface-2", className)} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Varianten kommen fertig aus /media; next/image würde sie ein zweites Mal kodieren */}
      <img src={cover.src} alt="" loading="eager" decoding="async" className="size-full object-cover" />
    </div>
  );
}

/**
 * Kopf von Entdecken (Entscheid 0025): dunkle Fläche mit Überschrift, Suche,
 * Schnellfiltern und den Merkmalen der Plattform; daneben eine Collage aus
 * Titelbildern der Region. Die Bilder sind Schmuck (leerer Alternativtext):
 * Dieselben Profile folgen darunter als Karten mit Namen und Link.
 */
export function DiscoverHero({ eyebrow, title, lead, regionMenu, search, quickLinks, features, covers }: DiscoverHeroProps) {
  const items = [
    { key: "identity", label: features.identity, icon: ShieldCheck },
    { key: "booking", label: features.booking, icon: CalendarCheck },
    { key: "messenger", label: features.messenger, icon: MessageCircle },
    { key: "reviews", label: features.reviews, icon: Star },
  ];
  const [first, second, third] = covers;
  return (
    // Ein Block, keine benannte Region: Die Reihen darunter sind die Regionen der Seite.
    <div
      className="-mx-4 -mt-4 grid gap-8 overflow-hidden bg-surface px-4 pt-8 pb-8 text-ink scheme-dark md:mx-0 md:mt-0 md:rounded-sheet md:p-12 lg:grid-cols-12 lg:gap-12"
    >
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-eyebrow text-ink-muted">{eyebrow}</p>
          {regionMenu}
        </div>
        <div className="flex flex-col gap-4">
          <h1 id="discover-title" className="text-display text-balance">
            {title}
          </h1>
          <p className="max-w-reading text-body text-ink-muted">{lead}</p>
        </div>
        {/* Die Suche bleibt hell wie in einer Karte, auch auf der dunklen Fläche. */}
        <div className="rounded-card bg-surface p-3 text-ink shadow-floating scheme-light md:p-4">{search}</div>
        {quickLinks}
        <ul aria-label={features.label} className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-6 md:grid-cols-4">
          {items.map(({ key, label, icon: Icon }) => (
            <li key={key} className="flex items-center gap-2 text-small text-ink">
              <Icon aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-ink-muted" />
              <span className="min-w-0">{label}</span>
            </li>
          ))}
        </ul>
      </div>
      {first ? (
        <div aria-hidden className="hidden grid-cols-5 grid-rows-2 gap-3 lg:col-span-5 lg:grid">
          <Cover cover={first} className={second ? "col-span-3 row-span-2" : "col-span-5 row-span-2"} />
          {second ? <Cover cover={second} className={third ? "col-span-2" : "col-span-2 row-span-2"} /> : null}
          {third ? <Cover cover={third} className="col-span-2" /> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Kategorien als dunkle Kacheln mit Namen, ohne Fotos (Entscheid 0025). */
export function DiscoverCategories({
  title,
  allLabel,
  allHref,
  categories,
}: {
  title: string;
  allLabel: string;
  allHref: string;
  categories: readonly { slug: string; name: string; href: string }[];
}) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="discover-categories" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="discover-categories" className="text-h2">
          {title}
        </h2>
        <UiLink href={allHref} className="inline-flex min-h-11 items-center text-small font-[550] text-accent hover:underline">
          {allLabel}
        </UiLink>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {categories.slice(0, 6).map((category) => (
          <li key={category.slug}>
            <UiLink
              href={category.href}
              className="flex min-h-24 items-end rounded-card bg-surface p-4 text-ink scheme-dark transition-colors duration-state hover:bg-surface-2"
            >
              <span className="font-display text-h3">{category.name}</span>
            </UiLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
