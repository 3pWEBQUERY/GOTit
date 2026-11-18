"use client";

import { Check, Heart } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { AvailabilityBadge } from "./availability-badge";
import { SponsoredLabel } from "./sponsored-label";

export type ProfileCardVariant = "grid" | "list" | "compact";

export interface ProfileCardImage {
  src: string;
  alt: string;
  /** Dominante Farbe des Bilds als CSS-Farbwert; füllt die Fläche, solange das Bild lädt. */
  placeholderColor?: string;
  /** Bild über dem Falz (erste Karten): sofort und mit hoher Priorität laden, sonst verzögert (LCP, Messung 1.14). */
  priority?: boolean;
}

export interface ProfileCardSignal {
  key: string;
  /** Das Signal als Wort, zum Beispiel «Identität geprüft». */
  label: string;
}

export interface ProfileCardFavorite {
  /** Zugänglicher Name mit dem Namen des Profils, zum Beispiel «Beispielname als Favorit speichern». */
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  disabled?: boolean;
}

export interface ProfileCardProps {
  variant?: ProfileCardVariant;
  /** Ziel der ganzen Karte: das Profil. */
  href: string;
  name: string;
  /** Initialen für die Fläche ohne Bild. Ohne Angabe aus dem Namen gebildet. */
  initials?: string;
  /** Ebene der Überschrift mit dem Namen, passend zur Seite. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  image?: ProfileCardImage;
  /** Region so allgemein, wie der Anbieter sie freigibt. */
  region?: string;
  /** Nur bei bezahlter Platzierung setzen, in der Regel «Anzeige». */
  sponsoredLabel?: string;
  /** Vertrauenssignale; gezeigt werden höchstens zwei. */
  signals?: readonly ProfileCardSignal[];
  /** Nur setzen, wenn der Kalender die Angabe deckt. */
  availability?: string;
  favorite?: ProfileCardFavorite;
  /** Nur Listenansicht: fertiger Text, zum Beispiel «Spricht Deutsch, Englisch». */
  languages?: string;
  /** Nur Listenansicht: fertiger Text, zum Beispiel «Preis ab CHF 200». */
  priceFrom?: string;
  /** Nur Listenansicht: fertiger Text, zum Beispiel «Nächster Termin Do, 19.11.». */
  nextAvailability?: string;
  className?: string;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase())
    .join("");
}

function Photo({ image, initials, className }: { image: ProfileCardImage | undefined; initials: string; className?: string }) {
  // Einzige Inline-Farbe: Sie ist ein Datenwert des Bilds, kein Gestaltungswert.
  const style: CSSProperties | undefined = image?.placeholderColor ? { backgroundColor: image.placeholderColor } : undefined;
  return (
    <div className={cn("flex aspect-4/5 items-center justify-center overflow-hidden rounded-card bg-surface-2", className)} style={style}>
      {image ? (
        <img
          src={image.src}
          alt={image.alt}
          loading={image.priority ? "eager" : "lazy"}
          fetchPriority={image.priority ? "high" : "auto"}
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden className="text-h2 text-ink-muted select-none">
          {initials}
        </span>
      )}
    </div>
  );
}

function FavoriteButton({ favorite, className }: { favorite: ProfileCardFavorite; className?: string }) {
  return (
    <button
      type="button"
      aria-label={favorite.label}
      title={favorite.label}
      aria-pressed={favorite.pressed}
      disabled={favorite.disabled}
      onClick={() => favorite.onPressedChange(!favorite.pressed)}
      className={cn(
        "z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink",
        "transition-colors duration-state hover:bg-surface-2 active:bg-border disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
    >
      <Heart aria-hidden strokeWidth={1.5} className="size-5" fill={favorite.pressed ? "currentColor" : "none"} />
    </button>
  );
}

function Signals({ signals }: { signals: readonly ProfileCardSignal[] }) {
  if (signals.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {signals.slice(0, 2).map((signal) => (
        <li key={signal.key} className="flex items-center gap-2 text-small text-ink">
          <Check aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-ink-muted" />
          <span className="min-w-0">{signal.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Karte eines Profils (PRD 9.3). Die ganze Karte führt zum Profil: Der Link
 * sitzt im Namen und spannt sich über die Karte; der Favorit-Button liegt als
 * eigenes Element darüber. Kein Text auf dem Bild, kein Online-Punkt, keine Sterne.
 */
export function ProfileCard({
  variant = "grid",
  href,
  name,
  initials,
  headingLevel = 3,
  image,
  region,
  sponsoredLabel,
  signals = [],
  availability,
  favorite,
  languages,
  priceFrom,
  nextAvailability,
  className,
}: ProfileCardProps) {
  const Heading = `h${headingLevel}` as const;
  const shownInitials = initials ?? initialsOf(name);
  const list = variant === "list";
  const compact = variant === "compact";

  const title = (
    <div className="flex items-center gap-2">
      <Heading className={cn("min-w-0 flex-1 truncate", compact ? "text-small font-[550]" : "text-h3")}>
        <UiLink
          href={href}
          className="rounded-chip after:absolute after:inset-0 after:rounded-card group-hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
        >
          {name}
        </UiLink>
      </Heading>
      {sponsoredLabel ? <SponsoredLabel label={sponsoredLabel} /> : null}
    </div>
  );
  const regionLine = region ? <p className="text-small text-ink-muted">{region}</p> : null;

  if (list) {
    return (
      <article className={cn("group relative flex items-start gap-4 text-ink", className)}>
        <Photo image={image} initials={shownInitials} className="w-24 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-1">
            {title}
            {regionLine}
          </div>
          <Signals signals={signals} />
          {languages ? <p className="text-small text-ink-muted">{languages}</p> : null}
          {priceFrom ? <p className="tabular text-small text-ink">{priceFrom}</p> : null}
          {nextAvailability ? <AvailabilityBadge label={nextAvailability} /> : null}
        </div>
        {favorite ? <FavoriteButton favorite={favorite} className="relative" /> : null}
      </article>
    );
  }

  return (
    <article className={cn("group relative flex flex-col text-ink", compact ? "gap-2" : "gap-3", className)}>
      <div className="relative">
        <Photo image={image} initials={shownInitials} className="w-full" />
        {favorite ? <FavoriteButton favorite={favorite} className="absolute right-2 bottom-2" /> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-col gap-1">
          {title}
          {regionLine}
        </div>
        {compact ? null : <Signals signals={signals} />}
        {!compact && availability ? <AvailabilityBadge label={availability} /> : null}
      </div>
    </article>
  );
}

export interface ProfileCardSkeletonProps {
  variant?: ProfileCardVariant;
  className?: string;
}

const pulse = "animate-skeleton bg-surface-2";

/** Skelett in der Form der Karte. Rein dekorativ; den Ladezustand meldet `LoadingRegion`. */
export function ProfileCardSkeleton({ variant = "grid", className }: ProfileCardSkeletonProps) {
  if (variant === "list") {
    return (
      <div aria-hidden className={cn("flex items-start gap-4", className)}>
        <div className={cn(pulse, "aspect-4/5 w-24 shrink-0 rounded-card")} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
          <div className={cn(pulse, "h-6 w-1/2 rounded-chip")} />
          <div className={cn(pulse, "h-4 w-1/3 rounded-chip")} />
          <div className={cn(pulse, "h-4 w-2/3 rounded-chip")} />
          <div className={cn(pulse, "h-4 w-1/2 rounded-chip")} />
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden className={cn("flex flex-col", variant === "compact" ? "gap-2" : "gap-3", className)}>
      <div className={cn(pulse, "aspect-4/5 w-full rounded-card")} />
      <div className="flex flex-col gap-2">
        <div className={cn(pulse, "h-6 w-3/4 rounded-chip")} />
        <div className={cn(pulse, "h-4 w-1/2 rounded-chip")} />
        {variant === "compact" ? null : <div className={cn(pulse, "h-4 w-2/3 rounded-chip")} />}
      </div>
    </div>
  );
}
