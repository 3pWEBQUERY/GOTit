import { getDb } from "@app/db";
import { IDENTITY_VALIDITY_DAYS, newExternalRef, resolveIdentityProvider } from "./provider";

export type StartIdentityCheckResult = { ok: true; redirectUrl: string } | { ok: false; reason: "provider-not-configured" | "not-a-provider" };

/** Startet eine Prüfung für das eigene Anbieterkonto. */
export async function startIdentityCheck(userId: string, returnPath: string): Promise<StartIdentityCheckResult> {
  const provider = resolveIdentityProvider();
  if (!provider) return { ok: false, reason: "provider-not-configured" };
  const db = getDb();
  const profile = await db.providerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return { ok: false, reason: "not-a-provider" };
  const externalRef = newExternalRef();
  await db.identityCheck.create({ data: { userId, provider: provider.id, externalRef } });
  return { ok: true, redirectUrl: provider.startUrl(externalRef, returnPath) };
}

export async function getLatestIdentityCheck(userId: string) {
  return getDb().identityCheck.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, ageOver18: true, livenessPassed: true, checkedAt: true, expiresAt: true, failureReason: true, provider: true },
  });
}

export interface IdentityResult {
  approved: boolean;
  ageOver18: boolean;
  livenessPassed: boolean;
  failureReason?: string | undefined;
}

/**
 * Übernimmt das Ergebnis des Dienstleisters. Eine bestandene Prüfung verlangt
 * Volljährigkeit und Lebendigkeit. Ergibt die Prüfung eine minderjährige
 * Person, wird das Profil sofort gesperrt und Trust & Safety über das
 * Audit-Log informiert (PRD 16.1). Nur Prüfungen im Status PENDING lassen sich
 * abschliessen; eine Referenz wirkt genau einmal.
 */
export async function applyIdentityResult(externalRef: string, result: IdentityResult, now = new Date()): Promise<"applied" | "unknown" | "already-final"> {
  const db = getDb();
  const check = await db.identityCheck.findUnique({ where: { externalRef }, select: { id: true, userId: true, status: true } });
  if (!check) return "unknown";
  if (check.status !== "PENDING") return "already-final";
  const approved = result.approved && result.ageOver18 && result.livenessPassed;
  const expiresAt = approved ? new Date(now.getTime() + IDENTITY_VALIDITY_DAYS * 24 * 60 * 60 * 1000) : null;
  await db.identityCheck.update({
    where: { id: check.id },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      ageOver18: result.ageOver18,
      livenessPassed: result.livenessPassed,
      checkedAt: now,
      expiresAt,
      failureReason: approved ? null : (result.failureReason ?? (result.ageOver18 ? "not-verified" : "under-age")),
    },
  });
  if (approved) {
    const profile = await db.providerProfile.findUnique({ where: { userId: check.userId }, select: { id: true, onboardingSteps: true } });
    if (profile && !profile.onboardingSteps.includes("identity")) {
      await db.providerProfile.update({ where: { id: profile.id }, data: { onboardingSteps: { push: "identity" } } });
    }
  }
  if (!result.ageOver18) {
    await db.providerProfile.updateMany({ where: { userId: check.userId }, data: { status: "SUSPENDED" } });
    await db.auditEvent.create({ data: { action: "trust-safety.minor-suspected", target: `user:${check.userId}`, reason: "Identitätsprüfung: nicht volljährig" } });
  }
  return "applied";
}
