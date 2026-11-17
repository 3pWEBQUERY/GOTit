import { getDb, type ProviderStatus } from "@app/db";
import { parsePendingChanges, editMode, type EditMode, type PendingChanges } from "./change-policy";
import { PROFILE_SECTIONS, type EditorValues, type ProfileSection } from "./editor-schemas";
import { sectionStatus, type SectionStatus } from "./section-status";

export interface EditorRate {
  id: string;
  durationMinutes: number;
  priceChf: number;
  note: string | null;
  hidden: boolean;
  updatedAt: Date;
}

export interface OwnProfileEditor {
  id: string;
  slug: string;
  status: ProviderStatus;
  mode: EditMode;
  /** Werte für die Formulare: Online-Stand, prüfpflichtige Felder mit der wartenden Änderung überlagert. */
  values: EditorValues;
  /** Online-Stand der prüfpflichtigen Felder, zum Vergleich vor dem Speichern. */
  published: { displayName: string; allowMessages: boolean; allowBookingRequests: boolean; regionIds: string[] };
  pending: PendingChanges | null;
  pendingSince: Date | null;
  /** Letzte entschiedene Änderungsprüfung, wenn sie abgelehnt wurde und nichts mehr wartet. */
  rejectedChange: { reason: string | null; decidedAt: Date | null } | null;
  rates: EditorRate[];
  sections: Record<ProfileSection, SectionStatus>;
  categoriesAvailable: number;
}

/**
 * Das eigene Profil für den Editor im Studio (PRD v2 11.2). Die Abfrage geht
 * über die Konto-ID der Sitzung; ein fremdes Profil ist so nicht erreichbar.
 */
export async function getOwnProfileForEditor(userId: string): Promise<OwnProfileEditor | null> {
  const db = getDb();
  const profile = await db.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
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
      regions: { select: { regionId: true } },
      services: { select: { categoryId: true } },
      rates: { orderBy: { sortOrder: "asc" }, select: { id: true, durationMinutes: true, priceChf: true, note: true, hidden: true, updatedAt: true } },
      reviews: { where: { kind: "CHANGE" }, orderBy: { submittedAt: "desc" }, take: 1, select: { decision: true, reason: true, decidedAt: true, submittedAt: true } },
    },
  });
  if (!profile) return null;
  const categoriesAvailable = await db.category.count({ where: { approved: true } });
  const pending = profile.pendingChanges === null ? null : parsePendingChanges(profile.pendingChanges);
  const published = {
    displayName: profile.displayName,
    allowMessages: profile.allowMessages,
    allowBookingRequests: profile.allowBookingRequests,
    regionIds: profile.regions.map((entry) => entry.regionId),
  };
  const critical = { ...published, ...(pending ?? {}) };
  const values: EditorValues = {
    basics: { displayName: critical.displayName, shortDescription: profile.shortDescription ?? "", languages: profile.languages as EditorValues["basics"]["languages"] },
    description: { description: profile.description ?? "" },
    offer: { categoryIds: profile.services.map((entry) => entry.categoryId) },
    rates: {
      rates: profile.rates.map((rate) => ({ id: rate.id, durationMinutes: rate.durationMinutes, priceChf: rate.priceChf, note: rate.note ?? undefined, hidden: rate.hidden })),
    },
    contact: { allowMessages: critical.allowMessages, allowBookingRequests: critical.allowBookingRequests },
    visibility: { visibility: profile.visibility, locationLabel: profile.locationLabel ?? "" },
    regions: { regionIds: critical.regionIds },
  };
  const latestChange = profile.reviews[0];
  return {
    id: profile.id,
    slug: profile.slug,
    status: profile.status,
    mode: editMode(profile.status),
    values,
    published,
    pending,
    pendingSince: pending && latestChange?.decision === null ? latestChange.submittedAt : null,
    rejectedChange: !pending && latestChange?.decision === "REJECTED" ? { reason: latestChange.reason, decidedAt: latestChange.decidedAt } : null,
    rates: profile.rates,
    sections: Object.fromEntries(PROFILE_SECTIONS.map((section) => [section, sectionStatus(section, values, categoriesAvailable)])) as Record<ProfileSection, SectionStatus>,
    categoriesAvailable,
  };
}
