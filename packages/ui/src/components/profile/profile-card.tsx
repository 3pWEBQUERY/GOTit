"use client";

import { ArrowRight, Check, Heart, MapPin } from "lucide-react";
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
  /** Vertrauenssignale; gezeigt werden in der Liste höchstens zwei, im Raster eins. */
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
  /** Nur Listenansicht: Beschriftung des Hinweises rechts, zum Beispiel «Profil ansehen». Die Karte selbst ist der Link. */
  actionLabel?: string;
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
    <div className={cn("flex aspect-4/5 items-center justify-center overflow-hidden bg-surface-2", className)} style={style}>
      {image ? (
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-layer ease-standard motion-safe:group-hover:scale-105"
        />
      ) : (
        <span aria-hidden className="font-display text-h1 text-ink-muted select-none">
          {initials}
        </span>
      )}
    </div>
  );
}

function FavoriteButton({ favorite, onPhoto, className }: { favorite: ProfileCardFavorite; onPhoto?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={favorite.label}
      title={favorite.label}
      aria-pressed={favorite.pressed}
      disabled={favorite.disabled}
      onClick={() => favorite.onPressedChange(!favorite.pressed)}
      className={cn(
        "z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-state disabled:cursor-not-allowed disabled:opacity-55",
        onPhoto
          ? "bg-surface/55 text-ink backdrop-blur-sm scheme-dark hover:bg-surface/80"
          : "border border-border bg-surface text-ink hover:bg-surface-2 active:bg-border",
        className,
      )}
    >
      <Heart aria-hidden strokeWidth={1.5} className="size-5" fill={favorite.pressed ? "currentColor" : "none"} />
    </button>
  );
}

/** Signale als neutrale Chips (PRD 5.1: Verifizierung nie grün). */
function Signals({ signals, max = 2, className, chipClassName }: { signals: readonly ProfileCardSignal[]; max?: number; className?: string; chipClassName?: string }) {
  if (signals.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1", className)}>
      {signals.slice(0, max).map((signal) => (
        <li key={signal.key} className={cn("inline-flex items-center gap-1 rounded-chip px-2 py-1 text-label", chipClassName)}>
          <Check aria-hidden strokeWidth={2} className="size-3.5 shrink-0" />
          <span className="min-w-0">{signal.label}</span>
        </li>
      ))}
    </ul>
  );
}

const cardLink =
  "rounded-chip after:absolute after:inset-0 after:z-[1] after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent";

/**
 * Karte eines Profils (PRD 9.3, Entscheid 0025). Die ganze Karte führt zum
 * Profil: Der Link sitzt im Namen und spannt sich über die Karte; der
 * Favorit-Button liegt als eigenes Element darüber. Im Raster stehen Name und
 * Region auf dem Foto über einem dunklen Schleier; in der Liste neben dem Foto,
 * mit Preis und «Profil ansehen». Kein Online-Punkt, keine Sterne.
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
  actionLabel,
  className,
}: ProfileCardProps) {
  const Heading = `h${headingLevel}` as const;
  const shownInitials = initials ?? initialsOf(name);

  if (variant === "list") {
    return (
      <article
        className={cn(
          "group relative flex items-stretch gap-4 rounded-card border border-border bg-surface p-3 text-ink transition-shadow duration-layer hover:shadow-raised md:gap-6 md:p-4",
          className,
        )}
      >
        <Photo image={image} initials={shownInitials} className="w-28 shrink-0 self-start rounded-control md:w-40" />
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Heading className="min-w-0 truncate text-h3">
                <UiLink href={href} className={cn(cardLink, "group-hover:underline")}>
                  {name}
                </UiLink>
              </Heading>
              {sponsoredLabel ? <SponsoredLabel label={sponsoredLabel} /> : null}
            </div>
            {region ? (
              <p className="flex items-center gap-1 text-small text-ink-muted">
                <MapPin aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
                <span className="min-w-0">{region}</span>
              </p>
            ) : null}
            <Signals signals={signals} chipClassName="border border-border bg-bg text-ink" />
            {languages ? <p className="text-small text-ink-muted">{languages}</p> : null}
            {nextAvailability ? <AvailabilityBadge label={nextAvailability} /> : null}
          </div>
          <div className="flex shrink-0 flex-col gap-3 md:items-end md:justify-between md:text-right">
            {priceFrom ? <p className="tabular text-h3 text-ink">{priceFrom}</p> : <span />}
            {actionLabel ? (
              <span
                aria-hidden
                className="hidden min-h-10 items-center gap-2 rounded-control bg-accent px-4 text-small font-[550] text-on-accent transition-colors duration-state group-hover:bg-accent/90 md:inline-flex"
              >
                {actionLabel}
                <ArrowRight strokeWidth={1.5} className="size-4" />
              </span>
            ) : null}
          </div>
        </div>
        {favorite ? <FavoriteButton favorite={favorite} className="relative self-start" /> : null}
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className={cn("group relative flex flex-col gap-2 text-ink", className)}>
        <Photo image={image} initials={shownInitials} className="w-full rounded-card" />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Heading className="min-w-0 flex-1 truncate text-small font-[550]">
              <UiLink href={href} className={cn(cardLink, "group-hover:underline")}>
                {name}
              </UiLink>
            </Heading>
            {sponsoredLabel ? <SponsoredLabel label={sponsoredLabel} /> : null}
          </div>
          {region ? <p className="text-small text-ink-muted">{region}</p> : null}
        </div>
      </article>
    );
  }

  return (
    // Foto und Schleier liegen per Grid übereinander, nicht absolut: So spannt sich der Link über die ganze Karte.
    <article className={cn("group relative isolate grid overflow-hidden rounded-card bg-surface-2 text-ink", className)}>
      <Photo image={image} initials={shownInitials} className="col-start-1 row-start-1 w-full" />
      {/* Auf dem Foto nur das erste Signal, wie ein Abzeichen; alle Signale stehen auf dem Profil. */}
      <Signals
        signals={signals}
        max={1}
        className="pointer-events-none absolute top-3 right-16 left-3 z-[2] scheme-dark"
        chipClassName="bg-surface/70 text-ink backdrop-blur-sm"
      />
      {favorite ? <FavoriteButton favorite={favorite} onPhoto className="absolute top-2 right-2" /> : null}
      <div className="col-start-1 row-start-1 flex flex-col gap-1 self-end p-4 pt-16 text-ink scheme-dark scrim-bottom">
        <div className="flex items-center gap-2">
          <Heading className="min-w-0 flex-1 truncate text-h3">
            <UiLink href={href} className={cn(cardLink, "group-hover:underline")}>
              {name}
            </UiLink>
          </Heading>
          {sponsoredLabel ? <SponsoredLabel label={sponsoredLabel} /> : null}
        </div>
        {region ? <p className="truncate text-small text-ink">{region}</p> : null}
        {availability ? <AvailabilityBadge label={availability} className="text-ink" /> : null}
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
      <div aria-hidden className={cn("flex items-start gap-4 rounded-card border border-border bg-surface p-3 md:gap-6 md:p-4", className)}>
        <div className={cn(pulse, "aspect-4/5 w-28 shrink-0 rounded-control md:w-40")} />
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
