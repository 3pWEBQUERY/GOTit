import { getDb, type ProviderStatus } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Viewer } from "../identity/types";
import { decideReview } from "../verification";
import { getOwnProfileForEditor } from "./editor";
import { getPublicProfile } from "./public-profile";
import { saveProfileSection } from "./save-section";

/** Läuft gegen Postgres, wie in der CI. Konten sind fiktiv und werden danach gelöscht. */
const db = getDb();
const run = `${Date.now()}`;
const ids: string[] = [];
const visitor: Viewer = { kind: "visitor" };
let regionIds: string[] = [];
const reviewer = `it_profil_pruefer_${run}`;

function member(userId = `it_profil_mitglied_${run}`): Viewer {
  return { kind: "account", userId, name: "Fiktiv", ageConfirmed: true, provider: null, organizations: [] };
}

interface Options {
  status?: ProviderStatus;
  identity?: "valid" | "expired" | "none";
  review?: "APPROVED" | "open";
  visibility?: "PUBLIC" | "MEMBERS";
}

async function provider(label: string, options: Options = {}) {
  const userId = `it_profil_${label}_${run}`;
  ids.push(userId);
  const slug = `fiktiv-profil-${label}-${run}`;
  await db.user.create({ data: { id: userId, name: `Fiktiv ${label}`, email: `${userId}@fiktiv.test`, emailVerified: true, accountType: "PROVIDER" } });
  const profile = await db.providerProfile.create({
    data: {
      userId,
      slug,
      displayName: `Fiktiv ${label}`,
      status: options.status ?? "PUBLISHED",
      visibility: options.visibility ?? "PUBLIC",
      description: "Fiktive Beschreibung eines Testprofils mit ausreichend Zeichen für die Prüfung.",
      languages: ["de", "en"],
      allowBookingRequests: false,
      regions: { create: [{ regionId: regionIds[0] ?? "" }] },
      rates: { create: [{ durationMinutes: 60, priceChf: 300 }, { durationMinutes: 120, priceChf: 550, hidden: true, sortOrder: 1 }] },
    },
  });
  const identity = options.identity ?? "valid";
  if (identity !== "none") {
    const expiresAt = new Date(Date.now() + (identity === "valid" ? 1 : -1) * 86_400_000 * 30);
    await db.identityCheck.create({
      data: { userId, provider: "test", externalRef: `it-${label}-${run}`, status: "APPROVED", ageOver18: true, livenessPassed: true, checkedAt: new Date(), expiresAt },
    });
  }
  const review = options.review ?? "APPROVED";
  await db.profileReview.create({ data: { providerProfileId: profile.id, ...(review === "APPROVED" ? { decision: "APPROVED", decidedAt: new Date() } : {}) } });
  return { userId, slug, profileId: profile.id, owner: member(userId) };
}

beforeAll(async () => {
  regionIds = (await db.region.findMany({ where: { approved: true }, orderBy: { slug: "asc" }, take: 3, select: { id: true } })).map((region) => region.id);
  ids.push(reviewer);
  await db.user.create({ data: { id: reviewer, name: "Fiktiv Prüfung", email: `${reviewer}@fiktiv.test`, emailVerified: true, twoFactorEnabled: true } });
  await db.internalRoleAssignment.create({ data: { userId: reviewer, role: "MODERATOR" } });
});
afterAll(async () => {
  await db.auditEvent.deleteMany({ where: { actorId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
});

const locale = { locale: "de" as const };

describe("Öffentliches Profil (PRD v2 10)", () => {
  it("freigegeben: bereit, nur öffentliche Felder, sichtbare Preise mit Stand", async () => {
    const { slug } = await provider("bereit");
    const result = await getPublicProfile(slug, visitor, locale);
    expect(result?.state).toBe("ready");
    if (result?.state !== "ready") return;
    expect(result.owner).toBeNull();
    expect(result.profile.rates.map((rate) => rate.priceChf)).toEqual([300]);
    expect(result.profile.ratesUpdatedAt).toBeInstanceOf(Date);
    expect(result.profile.trust.identity?.checkedAt).toBeInstanceOf(Date);
    expect(result.profile.trust.photos).toBe(false);
    expect(result.profile.contact).toEqual({ available: true, messages: true, bookingRequests: false, restricted: false });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("@fiktiv.test");
    expect(serialized).not.toContain("it_profil_bereit");
    expect(serialized).not.toContain("livenessPassed");
  });

  it.each([
    ["entwurf", { status: "DRAFT" }],
    ["eingereicht", { status: "SUBMITTED", review: "open" }],
    ["gesperrt", { status: "SUSPENDED" }],
    ["archiviert", { status: "ARCHIVED" }],
    ["abgelaufen", { identity: "expired" }],
    ["ohneidentitaet", { identity: "none" }],
    ["pausiertabgelaufen", { status: "PAUSED", identity: "expired" }],
  ] as [string, Options][])("%s: 404 für Besucher und Mitglieder", async (label, options) => {
    const { slug } = await provider(label, options);
    expect(await getPublicProfile(slug, visitor, locale)).toBeNull();
    expect(await getPublicProfile(slug, member(), locale)).toBeNull();
  });

  it("pausiert: erreichbar, ohne Kontakt", async () => {
    const { slug } = await provider("pausiert", { status: "PAUSED" });
    const result = await getPublicProfile(slug, visitor, locale);
    expect(result?.state).toBe("paused");
    if (result?.state === "paused") expect(result.profile.contact.available).toBe(false);
  });

  it("eingeschränkt: sichtbar wie veröffentlicht, aber ohne Kontaktaktionen", async () => {
    const { slug } = await provider("eingeschraenkt", { status: "RESTRICTED" });
    const result = await getPublicProfile(slug, visitor, locale);
    expect(result?.state).toBe("ready");
    if (result?.state === "ready") expect(result.profile.contact).toMatchObject({ available: false, messages: false, restricted: true });
  });

  it("nur für Mitglieder: Besucher erhalten nur den Hinweis, Mitglieder das Profil", async () => {
    const { slug } = await provider("mitglieder", { visibility: "MEMBERS" });
    expect(await getPublicProfile(slug, visitor, locale)).toEqual({ state: "members-only", slug, displayName: "Fiktiv mitglieder" });
    expect((await getPublicProfile(slug, member(), locale))?.state).toBe("ready");
  });

  it("der Inhaber sieht sein nicht öffentliches Profil mit Status", async () => {
    const { slug, owner } = await provider("inhaber", { status: "SUBMITTED", review: "open" });
    const result = await getPublicProfile(slug, owner, locale);
    expect(result?.state).toBe("owner-only");
    if (result?.state === "owner-only") expect(result.owner).toEqual({ status: "SUBMITTED", reachable: false, pendingChange: false });
  });
});

describe("Profil-Editor: Speichern und Prüfpflicht (PRD v2 11.2, v1 FR-PROFILE-006)", () => {
  it("unkritische Änderung gilt sofort und setzt contentUpdatedAt", async () => {
    const { userId, slug } = await provider("sofort");
    const description = "Neue fiktive Beschreibung, sofort sichtbar, mit genug Zeichen für die Regel.";
    expect(await saveProfileSection(userId, "description", { description })).toEqual({ ok: true, applied: true, pending: [] });
    const result = await getPublicProfile(slug, visitor, locale);
    expect(result?.state === "ready" && result.profile.description).toBe(description);
    expect(result?.state === "ready" && result.profile.contentUpdatedAt).toBeInstanceOf(Date);
    expect(await db.profileReview.count({ where: { providerProfile: { userId }, kind: "CHANGE" } })).toBe(0);
  });

  it("Anzeigename: wartet mit Prüffall CHANGE, das Profil bleibt online; Freigabe übernimmt ihn", async () => {
    const { userId, slug } = await provider("name");
    const result = await saveProfileSection(userId, "basics", { displayName: "Neuer Name Fiktiv", shortDescription: "Kurz und fiktiv", languages: ["de"] });
    expect(result).toEqual({ ok: true, applied: true, pending: ["displayName"] });
    const online = await getPublicProfile(slug, visitor, locale);
    expect(online?.state === "ready" && online.profile.displayName).toBe("Fiktiv name");
    expect(online?.state === "ready" && online.profile.shortDescription).toBe("Kurz und fiktiv");
    const editor = await getOwnProfileForEditor(userId);
    expect(editor?.values.basics.displayName).toBe("Neuer Name Fiktiv");
    expect(editor?.pending).toEqual({ displayName: "Neuer Name Fiktiv" });

    const review = await db.profileReview.findFirstOrThrow({ where: { providerProfile: { userId }, kind: "CHANGE", decision: null } });
    expect(await decideReview(reviewer, review.id, { decision: "CHANGES_REQUESTED", reason: "Nicht vorgesehen bei Änderungen", rule: "R-1", fieldNotes: { profile: "x x x" } })).toEqual({
      ok: false,
      reason: "invalid-decision",
    });
    expect(await decideReview(reviewer, review.id, { decision: "APPROVED", reason: "Name unauffällig und zulässig", rule: "R-1" })).toEqual({ ok: true });
    const after = await getPublicProfile(slug, visitor, locale);
    expect(after?.state === "ready" && after.profile.displayName).toBe("Neuer Name Fiktiv");
    const profile = await db.providerProfile.findUniqueOrThrow({ where: { userId } });
    expect(profile.pendingChanges).toBeNull();
    expect(profile.status).toBe("PUBLISHED");
    expect(await db.auditEvent.count({ where: { action: "profile_change.approved", target: `profile_review:${review.id}` } })).toBe(1);
    expect(await decideReview(reviewer, review.id, { decision: "REJECTED", reason: "Zweiter Entscheid zum selben Fall", rule: "R-1" })).toEqual({ ok: false, reason: "not-open" });
  });

  it("Ablehnen verwirft die Änderung mit Begründung, das Profil bleibt veröffentlicht", async () => {
    const { userId, slug } = await provider("abgelehnt");
    await saveProfileSection(userId, "contact", { allowMessages: true, allowBookingRequests: true });
    const review = await db.profileReview.findFirstOrThrow({ where: { providerProfile: { userId }, kind: "CHANGE", decision: null } });
    expect(await decideReview(reviewer, review.id, { decision: "REJECTED", reason: "Kontaktweg derzeit nicht zulässig", rule: "R-5" })).toEqual({ ok: true });
    const profile = await db.providerProfile.findUniqueOrThrow({ where: { userId } });
    expect(profile).toMatchObject({ status: "PUBLISHED", allowBookingRequests: false, pendingChanges: null });
    expect((await getOwnProfileForEditor(userId))?.rejectedChange?.reason).toBe("Kontaktweg derzeit nicht zulässig");
    expect((await getPublicProfile(slug, visitor, locale))?.state).toBe("ready");
  });

  it("eine geänderte wartende Änderung ersetzt den offenen Fall; ein Entscheid zum alten Fall trifft ins Leere", async () => {
    const { userId } = await provider("ersetzt");
    await saveProfileSection(userId, "basics", { displayName: "Erster Vorschlag", shortDescription: "", languages: ["de"] });
    const first = await db.profileReview.findFirstOrThrow({ where: { providerProfile: { userId }, kind: "CHANGE", decision: null } });
    await saveProfileSection(userId, "regions", { regionIds: [regionIds[0] ?? "", regionIds[1] ?? ""] });
    const open = await db.profileReview.findMany({ where: { providerProfile: { userId }, kind: "CHANGE", decision: null } });
    expect(open).toHaveLength(1);
    expect(open[0]?.id).not.toBe(first.id);
    expect(open[0]?.submittedAt).toEqual(first.submittedAt);
    await expect(decideReview(reviewer, first.id, { decision: "APPROVED", reason: "Entscheid zum ersetzten Fall", rule: "R-1" })).rejects.toThrow();
    await saveProfileSection(userId, "basics", { displayName: "Fiktiv ersetzt", shortDescription: "", languages: ["de"] });
    expect((await getOwnProfileForEditor(userId))?.pending).toEqual({ regionIds: [regionIds[0], regionIds[1]] });
    await saveProfileSection(userId, "regions", { regionIds: [regionIds[0] ?? ""] });
    expect((await getOwnProfileForEditor(userId))?.pending).toBeNull();
    expect(await db.profileReview.count({ where: { providerProfile: { userId }, kind: "CHANGE" } })).toBe(0);
  });

  it("Preis ausblenden: nicht mehr öffentlich; unveränderte Preise behalten ihr Datum", async () => {
    const { userId, slug } = await provider("preise");
    const editor = await getOwnProfileForEditor(userId);
    const [visible, hidden] = editor?.rates ?? [];
    await saveProfileSection(userId, "rates", {
      rates: [
        { id: visible?.id, durationMinutes: 60, priceChf: 300, hidden: true },
        { id: hidden?.id, durationMinutes: 120, priceChf: 550, hidden: true },
      ],
    });
    const result = await getPublicProfile(slug, visitor, locale);
    expect(result?.state === "ready" && result.profile.rates).toEqual([]);
    const rows = await db.rateItem.findMany({ where: { providerProfile: { userId } }, orderBy: { sortOrder: "asc" } });
    expect(rows[1]?.updatedAt).toEqual(hidden?.updatedAt);
  });

  it("Entwurf: alles sofort, ohne Prüffall; gesperrt: nichts lässt sich ändern", async () => {
    const draft = await provider("entwurfedit", { status: "DRAFT", review: "open" });
    expect(await saveProfileSection(draft.userId, "basics", { displayName: "Sofort Fiktiv", shortDescription: "", languages: ["de"] })).toEqual({ ok: true, applied: true, pending: [] });
    expect((await db.providerProfile.findUniqueOrThrow({ where: { userId: draft.userId } })).displayName).toBe("Sofort Fiktiv");
    expect(await db.profileReview.count({ where: { providerProfile: { userId: draft.userId }, kind: "CHANGE" } })).toBe(0);

    const locked = await provider("gesperrtedit", { status: "SUSPENDED" });
    expect(await saveProfileSection(locked.userId, "description", { description: "Beschreibung eines gesperrten Profils mit genug Zeichen zum Prüfen." })).toEqual({
      ok: false,
      reason: "locked",
    });
    expect(await saveProfileSection(`gibt-es-nicht-${run}`, "contact", { allowMessages: true, allowBookingRequests: true })).toEqual({ ok: false, reason: "not-found" });
  });

  it("nicht freigegebene Regionen werden abgewiesen", async () => {
    const { userId } = await provider("region");
    const hidden = await db.region.findFirst({ where: { approved: false }, select: { id: true } });
    if (!hidden) return;
    expect(await saveProfileSection(userId, "regions", { regionIds: [hidden.id] })).toEqual({ ok: false, reason: "invalid-region" });
  });
});
