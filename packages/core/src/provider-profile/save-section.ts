import { getDb, Prisma } from "@app/db";
import {
  editMode,
  hasPending,
  mergePending,
  parsePendingChanges,
  samePending,
  splitCritical,
  type CriticalField,
  type CriticalValues,
  type PendingChanges,
} from "./change-policy";
import { SECTION_SCHEMAS, type ProfileSection, type SectionValues } from "./editor-schemas";
import { requestSearchReindexForUser } from "../search/reindex";

type Tx = Prisma.TransactionClient;

export type SaveSectionResult =
  | { ok: true; applied: boolean; pending: CriticalField[] }
  | { ok: false; reason: "not-found" | "locked" | "invalid-region" | "invalid-category" };

/** Sperrt die Zeile des eigenen Profils bis zum Ende der Transaktion; Speichern und Prüfentscheid laufen so nacheinander. */
export async function lockProfile(tx: Tx, where: { userId: string } | { id: string }): Promise<string | null> {
  const rows =
    "userId" in where
      ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM provider_profile WHERE "userId" = ${where.userId} FOR UPDATE`
      : await tx.$queryRaw<{ id: string }[]>`SELECT id FROM provider_profile WHERE id = ${where.id} FOR UPDATE`;
  return rows[0]?.id ?? null;
}

async function replaceRegions(tx: Tx, profileId: string, regionIds: readonly string[]) {
  await tx.providerRegion.deleteMany({ where: { providerProfileId: profileId } });
  await tx.providerRegion.createMany({ data: [...new Set(regionIds)].map((regionId) => ({ providerProfileId: profileId, regionId })) });
}

/** Übernimmt prüffreie Werte der prüfpflichtigen Felder. */
async function applyCritical(tx: Tx, profileId: string, values: Partial<CriticalValues>) {
  const { regionIds, ...fields } = values;
  if (Object.keys(fields).length > 0) await tx.providerProfile.update({ where: { id: profileId }, data: fields });
  if (regionIds) await replaceRegions(tx, profileId, regionIds);
}

/**
 * Schreibt die wartenden Änderungen und hält den offenen Prüffall `CHANGE`
 * dazu aktuell. Ändert sich, was wartet, wird der offene Fall durch einen neuen
 * ersetzt (gleicher Platz in der Warteschlange). So entscheidet niemand über
 * einen Stand, den er nicht gesehen hat: Ein Entscheid zum alten Fall trifft
 * ins Leere.
 */
async function writePending(tx: Tx, profileId: string, previous: PendingChanges, next: PendingChanges, now: Date) {
  if (samePending(previous, next)) return;
  const open = await tx.profileReview.findFirst({ where: { providerProfileId: profileId, kind: "CHANGE", decision: null }, select: { id: true, submittedAt: true } });
  if (open) await tx.profileReview.delete({ where: { id: open.id } });
  if (!hasPending(next)) {
    await tx.providerProfile.update({ where: { id: profileId }, data: { pendingChanges: Prisma.DbNull } });
    return;
  }
  await tx.providerProfile.update({ where: { id: profileId }, data: { pendingChanges: next as Prisma.InputJsonValue } });
  await tx.profileReview.create({ data: { providerProfileId: profileId, kind: "CHANGE", submittedAt: open?.submittedAt ?? now } });
}

async function saveRates(tx: Tx, profileId: string, rates: SectionValues<"rates">["rates"]) {
  const existing = await tx.rateItem.findMany({ where: { providerProfileId: profileId } });
  const byId = new Map(existing.map((rate) => [rate.id, rate]));
  const kept = new Set<string>();
  for (const [index, rate] of rates.entries()) {
    const data = { durationMinutes: rate.durationMinutes, priceChf: rate.priceChf, note: rate.note?.trim() ? rate.note.trim() : null, hidden: rate.hidden, sortOrder: index };
    const current = rate.id ? byId.get(rate.id) : undefined;
    if (!current) {
      await tx.rateItem.create({ data: { ...data, providerProfileId: profileId } });
      continue;
    }
    kept.add(current.id);
    // Nur wirklich geänderte Preise erhalten ein neues Änderungsdatum («Stand»).
    const changed = (Object.keys(data) as (keyof typeof data)[]).some((key) => current[key] !== data[key]);
    if (changed) await tx.rateItem.update({ where: { id: current.id }, data });
  }
  const removed = existing.filter((rate) => !kept.has(rate.id)).map((rate) => rate.id);
  if (removed.length > 0) await tx.rateItem.deleteMany({ where: { id: { in: removed } } });
}

async function invalidRegions(tx: Tx, regionIds: readonly string[]): Promise<boolean> {
  const unique = new Set(regionIds);
  return (await tx.region.count({ where: { id: { in: [...unique] }, approved: true } })) !== unique.size;
}

async function invalidCategories(tx: Tx, categoryIds: readonly string[]): Promise<boolean> {
  const unique = new Set(categoryIds);
  return (await tx.category.count({ where: { id: { in: [...unique] }, approved: true } })) !== unique.size;
}

function requestedCritical(section: ProfileSection, data: unknown): Partial<CriticalValues> {
  if (section === "basics") return { displayName: SECTION_SCHEMAS.basics.parse(data).displayName };
  if (section === "contact") return SECTION_SCHEMAS.contact.parse(data);
  if (section === "regions") return { regionIds: SECTION_SCHEMAS.regions.parse(data).regionIds };
  return {};
}

/** Prüffreie Felder des Abschnitts; gelten sofort. */
async function saveFreeFields(tx: Tx, profileId: string, section: ProfileSection, input: unknown): Promise<boolean> {
  switch (section) {
    case "basics": {
      const { shortDescription, languages } = SECTION_SCHEMAS.basics.parse(input);
      await tx.providerProfile.update({ where: { id: profileId }, data: { shortDescription: shortDescription || null, languages } });
      return true;
    }
    case "description":
      await tx.providerProfile.update({ where: { id: profileId }, data: SECTION_SCHEMAS.description.parse(input) });
      return true;
    case "offer": {
      const { categoryIds } = SECTION_SCHEMAS.offer.parse(input);
      await tx.providerService.deleteMany({ where: { providerProfileId: profileId } });
      await tx.providerService.createMany({ data: [...new Set(categoryIds)].map((categoryId) => ({ providerProfileId: profileId, categoryId })) });
      return true;
    }
    case "rates":
      await saveRates(tx, profileId, SECTION_SCHEMAS.rates.parse(input).rates);
      return true;
    case "visibility": {
      const { visibility, locationLabel } = SECTION_SCHEMAS.visibility.parse(input);
      await tx.providerProfile.update({ where: { id: profileId }, data: { visibility, locationLabel: locationLabel || null } });
      return true;
    }
    case "contact":
    case "regions":
      return false;
  }
}

/**
 * Speichert einen Abschnitt des eigenen Profils (PRD v2 11.2). Prüfpflichtige
 * Änderungen an freigegebenen Profilen landen in `pendingChanges` mit einem
 * Prüffall `CHANGE`; das bisherige Profil bleibt online. Alles andere gilt
 * sofort und setzt `contentUpdatedAt`. Im Entwurf und in Korrektur gilt alles
 * sofort. Die Berechtigung steckt in der Abfrage: nur das Profil des Kontos.
 */
export async function saveProfileSection(userId: string, section: ProfileSection, input: unknown, now = new Date()): Promise<SaveSectionResult> {
  const parsed = SECTION_SCHEMAS[section].parse(input);
  const result = await getDb().$transaction(async (tx): Promise<SaveSectionResult> => {
    const profileId = await lockProfile(tx, { userId });
    if (!profileId) return { ok: false, reason: "not-found" };
    const profile = await tx.providerProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { status: true, displayName: true, allowMessages: true, allowBookingRequests: true, pendingChanges: true, regions: { select: { regionId: true } } },
    });
    const mode = editMode(profile.status);
    if (mode === "locked") return { ok: false, reason: "locked" };
    if (section === "regions" && (await invalidRegions(tx, SECTION_SCHEMAS.regions.parse(parsed).regionIds))) return { ok: false, reason: "invalid-region" };
    if (section === "offer" && (await invalidCategories(tx, SECTION_SCHEMAS.offer.parse(parsed).categoryIds))) return { ok: false, reason: "invalid-category" };

    const current: CriticalValues = {
      displayName: profile.displayName,
      allowMessages: profile.allowMessages,
      allowBookingRequests: profile.allowBookingRequests,
      regionIds: profile.regions.map((entry) => entry.regionId),
    };
    const split = splitCritical(current, requestedCritical(section, parsed), mode);
    await applyCritical(tx, profileId, split.immediate);
    const freeSaved = await saveFreeFields(tx, profileId, section, parsed);
    const previous = profile.pendingChanges === null ? {} : parsePendingChanges(profile.pendingChanges);
    await writePending(tx, profileId, previous, mergePending(previous, section, split), now);
    const applied = freeSaved || Object.keys(split.immediate).length > 0;
    if (applied) await tx.providerProfile.update({ where: { id: profileId }, data: { contentUpdatedAt: now } });
    return { ok: true, applied, pending: Object.keys(split.pending) as CriticalField[] };
  });
  if (result.ok && result.applied) await requestSearchReindexForUser(userId);
  return result;
}
