import { getDb, type ProviderStatus, type RegionKind } from "@app/db";
import type { Viewer } from "../identity/types";
import { pickLocalizedName, type Locale } from "../locale";
import { listProfileMedia, type PublicMedia } from "../media";
import { isIdentityValid } from "../verification/policy";
import { contactOptions, isReachable, publicState, type ContactOptions, type PublicState } from "./public-policy";

export interface PublicRegion {
  id: string;
  slug: string;
  kind: RegionKind;
  name: string;
  /** Kanton einer Stadt, für `/ch/[kanton]/[stadt]`. */
  cantonSlug: string | null;
}

export interface PublicRate {
  key: string;
  durationMinutes: number;
  priceChf: number;
  note: string | null;
}

/** Was eine Profilseite zeigen darf. Nie Konto-ID, E-Mail oder Prüfdetails. */
export interface PublicProfile {
  slug: string;
  displayName: string;
  shortDescription: string | null;
  description: string | null;
  languages: string[];
  regions: PublicRegion[];
  locationLabel: string | null;
  rates: PublicRate[];
  /** Jüngste Änderung der sichtbaren Preise («Stand: Datum»). */
  ratesUpdatedAt: Date | null;
  services: { slug: string; name: string }[];
  trust: {
    /** «Identität geprüft» nur bei gültiger Prüfung mit Prüfdatum. */
    identity: { checkedAt: Date } | null;
    /** «Fotos geprüft» nur mit mindestens einem freigegebenen Medium. */
    photos: boolean;
  };
  contentUpdatedAt: Date | null;
  media: PublicMedia[];
  contact: ContactOptions;
}

export interface OwnerView {
  status: ProviderStatus;
  /** Sehen Besucher das Profil gerade? */
  reachable: boolean;
  /** Wartet eine prüfpflichtige Änderung? */
  pendingChange: boolean;
}

export type PublicProfileResult =
  | { state: Exclude<PublicState, "members-only">; profile: PublicProfile; owner: OwnerView | null }
  | { state: "members-only"; slug: string; displayName: string }
  /** Nicht öffentlich, aber die eigene Seite: Der Inhaber sieht sie mit Hinweis auf den Status. */
  | { state: "owner-only"; profile: PublicProfile; owner: OwnerView };

const SLUG_MAX = 80;

function byKindAndName(a: PublicRegion, b: PublicRegion, collator: Intl.Collator): number {
  if (a.kind !== b.kind) return a.kind === "CITY" ? -1 : 1;
  return collator.compare(a.name, b.name);
}

async function loadProfile(slug: string) {
  return getDb().providerProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      userId: true,
      slug: true,
      status: true,
      displayName: true,
      shortDescription: true,
      description: true,
      languages: true,
      locationLabel: true,
      allowMessages: true,
      allowBookingRequests: true,
      visibility: true,
      pendingChanges: true,
      contentUpdatedAt: true,
      regions: {
        select: {
          region: { select: { id: true, slug: true, kind: true, approved: true, nameDe: true, nameFr: true, nameIt: true, nameEn: true, parent: { select: { slug: true } } } },
        },
      },
      services: { select: { category: { select: { slug: true, approved: true, sortOrder: true, nameDe: true, nameFr: true, nameIt: true, nameEn: true } } } },
      rates: { where: { hidden: false }, orderBy: { sortOrder: "asc" }, select: { durationMinutes: true, priceChf: true, note: true, updatedAt: true } },
      reviews: { where: { kind: "PROFILE" }, orderBy: { submittedAt: "desc" }, take: 1, select: { decision: true } },
    },
  });
}

type LoadedProfile = NonNullable<Awaited<ReturnType<typeof loadProfile>>>;

function toPublic(profile: LoadedProfile, locale: Locale, identityCheckedAt: Date | null, media: PublicMedia[]): PublicProfile {
  const collator = new Intl.Collator(locale);
  const regions = profile.regions
    .filter((entry) => entry.region.approved)
    .map(({ region }) => ({ id: region.id, slug: region.slug, kind: region.kind, name: pickLocalizedName(region, locale), cantonSlug: region.parent?.slug ?? null }))
    .sort((a, b) => byKindAndName(a, b, collator));
  const services = profile.services
    .filter((entry) => entry.category.approved)
    .sort((a, b) => a.category.sortOrder - b.category.sortOrder)
    .map(({ category }) => ({ slug: category.slug, name: pickLocalizedName(category, locale) }));
  const ratesUpdatedAt = profile.rates.reduce<Date | null>((latest, rate) => (!latest || rate.updatedAt > latest ? rate.updatedAt : latest), null);
  return {
    slug: profile.slug,
    displayName: profile.displayName,
    shortDescription: profile.shortDescription,
    description: profile.description,
    languages: profile.languages,
    regions,
    locationLabel: profile.locationLabel,
    rates: profile.rates.map((rate, index) => ({ key: `r${index}`, durationMinutes: rate.durationMinutes, priceChf: rate.priceChf, note: rate.note })),
    ratesUpdatedAt,
    services,
    trust: { identity: identityCheckedAt ? { checkedAt: identityCheckedAt } : null, photos: media.length > 0 },
    contentUpdatedAt: profile.contentUpdatedAt,
    media,
    contact: contactOptions(profile.status, profile.allowMessages, profile.allowBookingRequests),
  };
}

/**
 * Das öffentliche Profil unter `/p/[slug]` (PRD v2 10). Prüft bei jedem Aufruf
 * `isPubliclyVisible` über `publicState`. Der Inhaber sieht seine Seite auch,
 * wenn sie nicht öffentlich ist, immer mit dem Online-Stand, nie mit wartenden
 * Änderungen.
 */
export async function getPublicProfile(slug: string, viewer: Viewer, options: { locale: Locale; now?: Date }): Promise<PublicProfileResult | null> {
  if (slug.length === 0 || slug.length > SLUG_MAX) return null;
  const now = options.now ?? new Date();
  const profile = await loadProfile(slug);
  if (!profile) return null;
  const identity = await getDb().identityCheck.findFirst({
    where: { userId: profile.userId },
    orderBy: { createdAt: "desc" },
    select: { status: true, ageOver18: true, livenessPassed: true, expiresAt: true, checkedAt: true },
  });
  const facts = { status: profile.status, visibility: profile.visibility, identity, latestProfileReview: profile.reviews[0]?.decision ?? null };
  const isOwner = viewer.kind === "account" && viewer.userId === profile.userId;
  const state = publicState(facts, viewer, now);
  if (!state && !isOwner) return null;
  if (state === "members-only") return { state, slug: profile.slug, displayName: profile.displayName };

  const viewerIsMember = viewer.kind === "account" && viewer.ageConfirmed;
  const media = await listProfileMedia(profile.id, { viewerIsMember });
  const checkedAt = isIdentityValid(identity, now) ? (identity?.checkedAt ?? null) : null;
  const result = toPublic(profile, options.locale, checkedAt, media);
  const owner: OwnerView | null = isOwner
    ? { status: profile.status, reachable: isReachable(facts, now), pendingChange: profile.pendingChanges !== null }
    : null;
  if (!state && owner) return { state: "owner-only", profile: result, owner };
  return { state: state === "paused" ? "paused" : "ready", profile: result, owner };
}
