import { getDb } from "@app/db";
import { canSubmit, isIdentityValid } from "../verification/policy";
import { CONSENT_VERSIONS } from "../account/consent";
import { ONBOARDING_STEPS, offerSchema, profileBasicsSchema, regionsSchema, submitSchema, type OnboardingStepKey } from "./schemas";

async function ownProfile(userId: string) {
  return getDb().providerProfile.findUniqueOrThrow({
    where: { userId },
    select: {
      id: true,
      slug: true,
      status: true,
      displayName: true,
      description: true,
      languages: true,
      onboardingSteps: true,
      regions: { select: { regionId: true } },
      rates: { orderBy: { sortOrder: "asc" }, select: { durationMinutes: true, priceChf: true, note: true } },
      reviews: { orderBy: { submittedAt: "desc" }, take: 1, select: { decision: true, reason: true, fieldNotes: true, submittedAt: true } },
    },
  });
}

/** Stand des Onboardings: Daten, erledigte Schritte und was zum Einreichen fehlt. */
export async function getOnboardingState(userId: string, now = new Date()) {
  const profile = await ownProfile(userId);
  const identity = await getDb().identityCheck.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  const identityValid = isIdentityValid(identity, now);
  const done = new Set<OnboardingStepKey>(profile.onboardingSteps as OnboardingStepKey[]);
  if (identityValid) done.add("identity");
  else done.delete("identity");
  if (profile.regions.length === 0) done.delete("regions");
  if (!profileBasicsSchema.safeParse(profile).success) done.delete("profile");
  const missing = ONBOARDING_STEPS.filter((step) => step.required && step.key !== "submit" && !done.has(step.key)).map((step) => step.key);
  return {
    profile,
    identity: identity ? { status: identity.status, expiresAt: identity.expiresAt, failureReason: identity.failureReason } : null,
    done: [...done],
    missing,
    canSubmit: canSubmit(profile.status, identity, missing, now),
    latestReview: profile.reviews[0] ?? null,
  };
}

async function markDone(profileId: string, current: string[], step: OnboardingStepKey) {
  if (current.includes(step)) return;
  await getDb().providerProfile.update({ where: { id: profileId }, data: { onboardingSteps: { push: step } } });
}

/** Nur Profile im Entwurf oder in Korrektur lassen sich im Onboarding ändern. */
function editable(status: string): boolean {
  return status === "DRAFT" || status === "CHANGES_REQUESTED";
}

export type SaveResult = { ok: true } | { ok: false; reason: "not-editable" | "invalid-region" };

export async function saveRegions(userId: string, input: unknown): Promise<SaveResult> {
  const { regionIds } = regionsSchema.parse(input);
  const profile = await ownProfile(userId);
  if (!editable(profile.status)) return { ok: false, reason: "not-editable" };
  const db = getDb();
  const approved = await db.region.count({ where: { id: { in: regionIds }, approved: true } });
  if (approved !== new Set(regionIds).size) return { ok: false, reason: "invalid-region" };
  await db.$transaction([
    db.providerRegion.deleteMany({ where: { providerProfileId: profile.id } }),
    db.providerRegion.createMany({ data: [...new Set(regionIds)].map((regionId) => ({ providerProfileId: profile.id, regionId })) }),
  ]);
  await markDone(profile.id, profile.onboardingSteps, "regions");
  return { ok: true };
}

export async function saveProfileBasics(userId: string, input: unknown): Promise<SaveResult> {
  const data = profileBasicsSchema.parse(input);
  const profile = await ownProfile(userId);
  if (!editable(profile.status)) return { ok: false, reason: "not-editable" };
  await getDb().providerProfile.update({ where: { id: profile.id }, data });
  await markDone(profile.id, profile.onboardingSteps, "profile");
  return { ok: true };
}

export async function saveOffer(userId: string, input: unknown): Promise<SaveResult> {
  const { rates } = offerSchema.parse(input);
  const profile = await ownProfile(userId);
  if (!editable(profile.status)) return { ok: false, reason: "not-editable" };
  const db = getDb();
  await db.$transaction([
    db.rateItem.deleteMany({ where: { providerProfileId: profile.id } }),
    db.rateItem.createMany({ data: rates.map((rate, index) => ({ ...rate, providerProfileId: profile.id, sortOrder: index })) }),
  ]);
  await markDone(profile.id, profile.onboardingSteps, "offer");
  return { ok: true };
}

/** Freiwillige Schritte und die Vorschau gelten als erledigt, sobald sie besucht und bestätigt sind. */
export async function completeStep(userId: string, step: "media" | "availability" | "preview"): Promise<SaveResult> {
  const profile = await ownProfile(userId);
  if (!editable(profile.status)) return { ok: false, reason: "not-editable" };
  await markDone(profile.id, profile.onboardingSteps, step);
  return { ok: true };
}

export type SubmitResult = { ok: true } | { ok: false; reason: "incomplete"; missing: OnboardingStepKey[] };

/**
 * Einreichen: hält die Zustimmung zur Veröffentlichung fest und legt einen
 * Prüffall an. Öffentlich wird nichts ohne manuelle Freigabe (PRD 16.1).
 */
export async function submitProfile(userId: string, input: unknown, now = new Date()): Promise<SubmitResult> {
  submitSchema.parse(input);
  const state = await getOnboardingState(userId, now);
  if (!state.canSubmit) return { ok: false, reason: "incomplete", missing: state.missing };
  const db = getDb();
  await db.$transaction([
    db.providerProfile.update({ where: { id: state.profile.id }, data: { status: "SUBMITTED", submittedAt: now, onboardingSteps: { push: "submit" } } }),
    db.profileReview.create({ data: { providerProfileId: state.profile.id, submittedAt: now } }),
    db.consentRecord.create({ data: { userId, kind: "PROFILE_PUBLICATION", version: CONSENT_VERSIONS.PROFILE_PUBLICATION, grantedAt: now } }),
  ]);
  return { ok: true };
}
