import { mediaUrl } from "@app/core/media/variants";
import type { PublicProfile, PublicRegion } from "@app/core/provider-profile";

/** Kontakt, wie die Seite ihn zeigt. Terminanfrage und Nachrichten kommen mit 1.9 und 1.8 (Entscheid 0012). */
export type ContactState = { kind: "open"; messages: boolean; bookingRequests: boolean } | { kind: "none" } | { kind: "paused" } | { kind: "restricted" };

export interface ViewRegion {
  id: string;
  name: string;
  /** Regionale Landingpage; fehlt in der Vorschau des Onboardings. */
  href: string | null;
}

export interface ViewMedia {
  key: string;
  alt: string | null;
  src: string | null;
  placeholderColor: string | null;
  locked: boolean;
}

/**
 * Daten der Profilansicht. Dieselbe Form speist `/p/[name]`, die Vorschau im
 * Studio (mit ungespeicherten Werten) und die Vorschau im Onboarding; Daten
 * als ISO-Text, damit sie unverändert in Client-Komponenten gehen.
 */
export interface ProfileViewModel {
  slug: string;
  displayName: string;
  shortDescription: string | null;
  description: string | null;
  languages: string[];
  regions: ViewRegion[];
  locationLabel: string | null;
  rates: { key: string; durationMinutes: number; priceChf: number; note: string | null }[];
  ratesUpdatedAt: string | null;
  services: { key: string; name: string }[];
  identityCheckedAt: string | null;
  photosChecked: boolean;
  contentUpdatedAt: string | null;
  media: ViewMedia[];
  contact: ContactState;
}

export function contactState(profile: Pick<PublicProfile, "contact">, paused: boolean): ContactState {
  if (paused) return { kind: "paused" };
  if (profile.contact.restricted) return { kind: "restricted" };
  if (!profile.contact.messages && !profile.contact.bookingRequests) return { kind: "none" };
  return { kind: "open", messages: profile.contact.messages, bookingRequests: profile.contact.bookingRequests };
}

export function toViewModel(profile: PublicProfile, options: { paused: boolean; regionHref: (region: PublicRegion) => string }): ProfileViewModel {
  return {
    slug: profile.slug,
    displayName: profile.displayName,
    shortDescription: profile.shortDescription,
    description: profile.description,
    languages: profile.languages,
    regions: profile.regions.map((region) => ({ id: region.id, name: region.name, href: options.regionHref(region) })),
    locationLabel: profile.locationLabel,
    rates: profile.rates,
    ratesUpdatedAt: profile.ratesUpdatedAt?.toISOString() ?? null,
    services: profile.services.map((service) => ({ key: service.slug, name: service.name })),
    identityCheckedAt: profile.trust.identity?.checkedAt.toISOString() ?? null,
    photosChecked: profile.trust.photos,
    contentUpdatedAt: profile.contentUpdatedAt?.toISOString() ?? null,
    media: profile.media.map((media) => ({
      key: media.id,
      alt: media.altText,
      src: media.locked ? null : mediaUrl(media.id, 960, "webp"),
      placeholderColor: media.dominantColor,
      locked: media.locked,
    })),
    contact: contactState(profile, options.paused),
  };
}

/** Initialen für die neutrale Fläche ohne Medien (PRD v2 4.3). */
export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase());
  return letters.join("") || "?";
}
