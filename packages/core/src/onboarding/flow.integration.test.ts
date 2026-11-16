import { getDb } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyIdentityResult, decideReview, isPubliclyVisible, startIdentityCheck } from "../verification";
import { getOnboardingState, saveOffer, saveProfileBasics, saveRegions, submitProfile } from "./service";

/** Läuft gegen Postgres, wie in der CI. Konten sind fiktiv und werden danach gelöscht. */
const db = getDb();
const run = `${Date.now()}`;
const ids: string[] = [];

async function provider(label: string) {
  const id = `it_${label}_${run}`;
  ids.push(id);
  await db.user.create({ data: { id, name: `Fiktiv ${label}`, email: `${id}@fiktiv.test`, emailVerified: true, accountType: "PROVIDER" } });
  await db.providerProfile.create({ data: { userId: id, slug: `fiktiv-${label}-${run}`, displayName: `Fiktiv ${label}`, status: "DRAFT" } });
  return id;
}

async function refOf(userId: string) {
  const check = await db.identityCheck.findFirstOrThrow({ where: { userId }, orderBy: { createdAt: "desc" } });
  return check.externalRef;
}

async function visible(userId: string, now = new Date()) {
  const profile = await db.providerProfile.findUniqueOrThrow({ where: { userId }, select: { status: true, reviews: { orderBy: { submittedAt: "desc" }, take: 1 } } });
  const identity = await db.identityCheck.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  return isPubliclyVisible({ profileStatus: profile.status, identity, latestReview: profile.reviews[0]?.decision ?? null }, now);
}

const basics = { displayName: "Fiktiver Name", description: "Fiktive Beschreibung eines Testprofils mit ausreichend Zeichen für die Prüfung.", languages: ["de", "en"] };

let regionId = "";
beforeAll(async () => {
  process.env.IDENTITY_PROVIDER = "test";
  process.env.APP_ENV = "test";
  regionId = (await db.region.findFirstOrThrow({ where: { approved: true } })).id;
});
afterAll(async () => {
  await db.auditEvent.deleteMany({ where: { target: { in: ids.map((id) => `user:${id}`) } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
});

describe("Onboarding, Prüfung und Freigabe (Schritt 1.5)", () => {
  it("vollständiger Weg: erst nach Identität, Einreichen und manueller Freigabe öffentlich", async () => {
    const userId = await provider("weg");
    expect((await startIdentityCheck(userId, "/de/studio/start")).ok).toBe(true);
    expect(await visible(userId)).toBe(false);

    await saveRegions(userId, { regionIds: [regionId] });
    await saveProfileBasics(userId, basics);
    await saveOffer(userId, { rates: [{ durationMinutes: 60, priceChf: 300 }] });
    expect((await getOnboardingState(userId)).missing).toEqual(["identity", "preview"]);
    expect((await submitProfile(userId)).ok).toBe(false);

    expect(await applyIdentityResult(await refOf(userId), { approved: true, ageOver18: true, livenessPassed: true })).toBe("applied");
    await db.providerProfile.update({ where: { userId }, data: { onboardingSteps: { push: "preview" } } });
    expect((await submitProfile(userId)).ok).toBe(true);
    expect(await visible(userId)).toBe(false);

    const review = await db.profileReview.findFirstOrThrow({ where: { providerProfile: { userId } } });
    expect(await decideReview("pruefer", review.id, { decision: "APPROVED", reason: "Angaben vollständig und plausibel", rule: "R-1" })).toEqual({ ok: true });
    expect(await visible(userId)).toBe(true);
    expect(await decideReview("pruefer", review.id, { decision: "REJECTED", reason: "Zweiter Entscheid zum selben Fall", rule: "R-1" })).toEqual({ ok: false, reason: "not-open" });
    expect(await db.auditEvent.count({ where: { target: `profile_review:${review.id}` } })).toBe(1);
  });

  it("eine Referenz wirkt nur einmal; unbekannte Referenzen ändern nichts", async () => {
    const userId = await provider("einmal");
    await startIdentityCheck(userId, "/de/studio/start");
    const ref = await refOf(userId);
    expect(await applyIdentityResult(ref, { approved: true, ageOver18: true, livenessPassed: true })).toBe("applied");
    expect(await applyIdentityResult(ref, { approved: false, ageOver18: false, livenessPassed: false })).toBe("already-final");
    expect(await applyIdentityResult("gibt-es-nicht", { approved: true, ageOver18: true, livenessPassed: true })).toBe("unknown");
  });

  it("minderjährig: Profil sofort gesperrt, Fall für Trust & Safety", async () => {
    const userId = await provider("minor");
    await startIdentityCheck(userId, "/de/studio/start");
    await applyIdentityResult(await refOf(userId), { approved: true, ageOver18: false, livenessPassed: true });
    const profile = await db.providerProfile.findUniqueOrThrow({ where: { userId } });
    expect(profile.status).toBe("SUSPENDED");
    const check = await db.identityCheck.findFirstOrThrow({ where: { userId } });
    expect(check.status).toBe("REJECTED");
    expect(await db.auditEvent.count({ where: { action: "trust-safety.minor-suspected", target: `user:${userId}` } })).toBe(1);
  });

  it("Freigabe scheitert, wenn die Identitätsprüfung inzwischen abgelaufen ist", async () => {
    const userId = await provider("abgelaufen");
    await startIdentityCheck(userId, "/de/studio/start");
    await applyIdentityResult(await refOf(userId), { approved: true, ageOver18: true, livenessPassed: true });
    await saveRegions(userId, { regionIds: [regionId] });
    await saveProfileBasics(userId, basics);
    await db.providerProfile.update({ where: { userId }, data: { onboardingSteps: { push: "preview" } } });
    expect((await submitProfile(userId)).ok).toBe(true);
    await db.identityCheck.updateMany({ where: { userId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const review = await db.profileReview.findFirstOrThrow({ where: { providerProfile: { userId } } });
    expect(await decideReview("pruefer", review.id, { decision: "APPROVED", reason: "Angaben vollständig und plausibel", rule: "R-1" })).toEqual({ ok: false, reason: "identity-invalid" });
  });

  it("Rückgabe zur Korrektur verlangt Gründe pro Feld und öffnet das Profil wieder zum Bearbeiten", async () => {
    const userId = await provider("korrektur");
    await startIdentityCheck(userId, "/de/studio/start");
    await applyIdentityResult(await refOf(userId), { approved: true, ageOver18: true, livenessPassed: true });
    await saveRegions(userId, { regionIds: [regionId] });
    await saveProfileBasics(userId, basics);
    await db.providerProfile.update({ where: { userId }, data: { onboardingSteps: { push: "preview" } } });
    await submitProfile(userId);
    const review = await db.profileReview.findFirstOrThrow({ where: { providerProfile: { userId } } });
    await expect(decideReview("pruefer", review.id, { decision: "CHANGES_REQUESTED", reason: "Beschreibung unklar formuliert", rule: "R-2" })).rejects.toThrow();
    expect(await decideReview("pruefer", review.id, { decision: "CHANGES_REQUESTED", reason: "Beschreibung unklar formuliert", rule: "R-2", fieldNotes: { profile: "Bitte die Beschreibung ergänzen" } })).toEqual({ ok: true });
    const state = await getOnboardingState(userId);
    expect(state.profile.status).toBe("CHANGES_REQUESTED");
    expect(state.latestReview?.fieldNotes).toEqual({ profile: "Bitte die Beschreibung ergänzen" });
    expect((await saveProfileBasics(userId, { ...basics, description: `${basics.description} Ergänzt.` })).ok).toBe(true);
  });
});
