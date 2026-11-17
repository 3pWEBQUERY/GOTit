import { getDb, type OrganizationKind } from "@app/db";
import type { Viewer } from "../identity/types";
import { pickLocalizedName, type Locale } from "../locale";

/**
 * Öffentliches Club- oder Agenturprofil `/c/[slug]` (v2 9.4): Über uns,
 * Standorte mit Öffnungszeiten, verknüpfte Anbieter, Galerie, Kontakt.
 * Nur veröffentlichte Organisationen (geprüfte Geschäftsidentität). Verknüpfte
 * Anbieter erscheinen nur nach ihrer Zustimmung (ACTIVE) und nur, wenn ihr
 * Profil selbst öffentlich ist; dafür gilt der Suchindex mit seinen Regeln.
 */
export interface PublicOrganization {
  slug: string;
  name: string;
  kind: OrganizationKind;
  description: string | null;
  website: string | null;
  phone: string | null;
  publicEmail: string | null;
  verified: true;
  /** Wann die Geschäftsidentität zuletzt freigegeben wurde (v1 FR-VERIFY-004). */
  verifiedAt: Date | null;
  locations: {
    id: string;
    name: string;
    description: string | null;
    regionName: string | null;
    areaLabel: string | null;
    phone: string | null;
    website: string | null;
    hours: { weekday: number; startMinute: number; endMinute: number }[];
    exceptions: {
      day: string;
      closed: boolean;
      startMinute: number | null;
      endMinute: number | null;
      note: string | null;
    }[];
  }[];
  providers: {
    slug: string;
    displayName: string;
    regionName: string | null;
    locationLabel: string | null;
    coverMediaId: string | null;
    coverColor: string | null;
    coverAlt: string | null;
    photosChecked: boolean;
    /** Standorte, an denen die Verknüpfung gilt; leer heisst «ohne bestimmten Standort». */
    locationIds: string[];
  }[];
  media: {
    id: string;
    altText: string | null;
    width: number;
    height: number;
    dominantColor: string | null;
    isCover: boolean;
    isLogo: boolean;
  }[];
}

const names = {
  nameDe: true,
  nameFr: true,
  nameIt: true,
  nameEn: true,
} as const;

export async function getPublicOrganization(
  slug: string,
  viewer: Viewer,
  locale: Locale,
  now = new Date(),
): Promise<PublicOrganization | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const db = getDb();
  const organization = await db.organization.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      description: true,
      website: true,
      phone: true,
      publicEmail: true,
      publishedAt: true,
      verifications: {
        where: { status: "APPROVED" },
        orderBy: { decidedAt: "desc" },
        take: 1,
        select: { decidedAt: true },
      },
      locations: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          areaLabel: true,
          phone: true,
          website: true,
          region: { select: { approved: true, ...names } },
          hours: {
            orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
            select: { weekday: true, startMinute: true, endMinute: true },
          },
          exceptions: {
            where: { day: { gte: now.toISOString().slice(0, 10) } },
            orderBy: { day: "asc" },
            take: 10,
            select: {
              day: true,
              closed: true,
              startMinute: true,
              endMinute: true,
              note: true,
            },
          },
        },
      },
      media: {
        where: {
          status: "PUBLISHED",
          visibility: "PUBLIC",
          deletedAt: null,
          width: { not: null },
          height: { not: null },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          altText: true,
          width: true,
          height: true,
          dominantColor: true,
          isCover: true,
          isLogo: true,
        },
      },
    },
  });
  if (!organization) return null;
  const links = await db.organizationLink.findMany({
    where: { organizationId: organization.id, status: "ACTIVE" },
    select: { providerProfileId: true, locationId: true },
  });
  const providers =
    links.length === 0
      ? []
      : await db.searchProfile.findMany({
          where: {
            providerProfileId: {
              in: links.map((link) => link.providerProfileId),
            },
            identityValidUntil: { gt: now },
            providerProfile: { status: "PUBLISHED" },
            ...(viewer.kind === "account" ? {} : { audience: "PUBLIC" }),
          },
          orderBy: { displayName: "asc" },
          select: {
            slug: true,
            displayName: true,
            providerProfileId: true,
            primaryRegionId: true,
            locationLabel: true,
            coverMediaId: true,
            coverColor: true,
            coverAlt: true,
            hasPhotos: true,
          },
        });
  const regionIds = [
    ...new Set(
      providers.flatMap((entry) =>
        entry.primaryRegionId ? [entry.primaryRegionId] : [],
      ),
    ),
  ];
  const regions =
    regionIds.length === 0
      ? []
      : await db.region.findMany({
          where: { id: { in: regionIds } },
          select: { id: true, ...names },
        });
  return {
    slug: organization.slug,
    name: organization.name,
    kind: organization.kind,
    description: organization.description,
    website: organization.website,
    phone: organization.phone,
    publicEmail: organization.publicEmail,
    verified: true,
    verifiedAt:
      organization.verifications[0]?.decidedAt ?? organization.publishedAt,
    locations: organization.locations.map((location) => ({
      id: location.id,
      name: location.name,
      description: location.description,
      regionName: location.region?.approved
        ? pickLocalizedName(location.region, locale)
        : null,
      areaLabel: location.areaLabel,
      phone: location.phone,
      website: location.website,
      hours: location.hours,
      exceptions: location.exceptions,
    })),
    providers: providers.map((entry) => {
      const region = regions.find((row) => row.id === entry.primaryRegionId);
      return {
        slug: entry.slug,
        displayName: entry.displayName,
        regionName: region ? pickLocalizedName(region, locale) : null,
        locationLabel: entry.locationLabel,
        coverMediaId: entry.coverMediaId,
        coverColor: entry.coverColor,
        coverAlt: entry.coverAlt,
        photosChecked: entry.hasPhotos,
        locationIds: [
          ...new Set(
            links.flatMap((link) =>
              link.providerProfileId === entry.providerProfileId &&
              link.locationId
                ? [link.locationId]
                : [],
            ),
          ),
        ],
      };
    }),
    media: organization.media.map((media) => ({
      ...media,
      width: media.width ?? 0,
      height: media.height ?? 0,
    })),
  };
}

/** Veröffentlichte Organisationen für `/clubs` und Entdecken, optional nach Region und Art. */
export async function listPublicOrganizations(
  locale: Locale,
  options: { kind?: OrganizationKind; regionSlug?: string } = {},
  now = new Date(),
) {
  const rows = await getDb().organization.findMany({
    where: {
      status: "PUBLISHED",
      ...(options.kind ? { kind: options.kind } : {}),
      ...(options.regionSlug
        ? {
            // Ein Kanton umfasst die Standorte in seinen Städten.
            locations: {
              some: {
                region: {
                  approved: true,
                  OR: [
                    { slug: options.regionSlug },
                    { parent: { slug: options.regionSlug } },
                  ],
                },
              },
            },
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 200,
    select: {
      slug: true,
      name: true,
      kind: true,
      description: true,
      locations: {
        select: { region: { select: { approved: true, ...names } } },
      },
      // Nur Anbieter, die auch auf der Seite erscheinen: aktiv, öffentlich, mit gültiger Prüfung.
      _count: {
        select: {
          links: {
            where: {
              status: "ACTIVE",
              providerProfile: {
                status: "PUBLISHED",
                searchEntry: {
                  is: { audience: "PUBLIC", identityValidUntil: { gt: now } },
                },
              },
            },
          },
        },
      },
    },
  });
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    description: row.description,
    regionNames: [
      ...new Set(
        row.locations.flatMap((location) =>
          location.region?.approved
            ? [pickLocalizedName(location.region, locale)]
            : [],
        ),
      ),
    ],
    providerCount: row._count.links,
  }));
}

/**
 * Querverweis «Verknüpft mit» auf `/p/[name]` (v2 8.2, 10): veröffentlichte
 * Organisationen mit aktiver Verknüpfung zu diesem Profil. Nur Name, Art,
 * Slug und freigegebene Regionen der Standorte.
 */
export async function listPublicOrganizationsOfProvider(
  providerSlug: string,
  locale: Locale,
) {
  if (!/^[a-z0-9-]{1,80}$/.test(providerSlug)) return [];
  const rows = await getDb().organization.findMany({
    where: {
      status: "PUBLISHED",
      links: {
        some: { status: "ACTIVE", providerProfile: { slug: providerSlug } },
      },
    },
    orderBy: { name: "asc" },
    take: 20,
    select: {
      slug: true,
      name: true,
      kind: true,
      locations: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { region: { select: { approved: true, ...names } } },
      },
    },
  });
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    regionNames: [
      ...new Set(
        row.locations.flatMap((location) =>
          location.region?.approved
            ? [pickLocalizedName(location.region, locale)]
            : [],
        ),
      ),
    ],
  }));
}
