import type { AccountType, ConsentKind, PrismaClient } from "@app/db";
import { hashPassword } from "better-auth/crypto";
import { USER_PREFIX } from "./ids";

/**
 * Demo-Konten (Entscheid 0023): volljährig bestätigt, E-Mail bestätigt, nie
 * eine interne Rolle. Ein Passwort gibt es nur mit `DEMO_PASSWORD`; ohne es
 * werden Passwort und Sitzungen entfernt, die Konten lassen sich dann nicht
 * anmelden.
 */
export interface DemoAccount {
  id: string;
  email: string;
  name: string;
  accountType: AccountType;
}

const CONSENT_VERSION = "2026-11-16";
const BASE_CONSENTS: ConsentKind[] = ["TERMS", "PRIVACY", "AGE_CONFIRMATION"];

export async function upsertAccount(db: PrismaClient, account: DemoAccount, now: Date): Promise<void> {
  if (!account.id.startsWith(USER_PREFIX)) throw new Error(`Demo-Konto ohne Präfix: ${account.id}`);
  await db.user.upsert({
    where: { id: account.id },
    create: { ...account, emailVerified: true, ageConfirmedAt: now },
    update: { email: account.email, name: account.name, accountType: account.accountType, emailVerified: true, deactivatedAt: null, deletionRequestedAt: null },
  });
  const consents: ConsentKind[] = account.accountType === "PROVIDER" ? [...BASE_CONSENTS, "PROFILE_PUBLICATION"] : BASE_CONSENTS;
  for (const kind of consents) {
    const id = `${account.id}_consent_${kind.toLowerCase()}`;
    await db.consentRecord.upsert({
      where: { id },
      create: { id, userId: account.id, kind, version: CONSENT_VERSION, grantedAt: now },
      update: { withdrawnAt: null },
    });
  }
  // Interne Rollen haben Demo-Konten nie, auch nicht, wenn jemand sie von Hand vergeben hat.
  await db.internalRoleAssignment.deleteMany({ where: { userId: account.id } });
}

/** Setzt oder entfernt das Passwort aller Demo-Konten. */
export async function applyCredentials(db: PrismaClient, userIds: readonly string[], password: string | null): Promise<void> {
  if (password === null) {
    await db.account.deleteMany({ where: { userId: { in: [...userIds] }, providerId: "credential" } });
    await db.session.deleteMany({ where: { userId: { in: [...userIds] } } });
    return;
  }
  const hash = await hashPassword(password);
  for (const userId of userIds) {
    const id = `${userId}_credential`;
    await db.account.upsert({
      where: { id },
      create: { id, accountId: userId, providerId: "credential", userId, password: hash },
      update: { password: hash },
    });
  }
}

/** Gültige Identitätsprüfung des Test-Anbieters (PRD 16.1): volljährig, Lebendigkeit bestanden, ein Jahr gültig. */
export async function upsertIdentityCheck(db: PrismaClient, userId: string, now: Date): Promise<void> {
  const id = `${userId}_identity`;
  const checkedAt = new Date(now.getTime() - 200 * 86_400_000);
  const data = { status: "APPROVED" as const, ageOver18: true, livenessPassed: true, checkedAt, expiresAt: new Date(now.getTime() + 365 * 86_400_000), failureReason: null };
  await db.identityCheck.upsert({
    where: { id },
    create: { id, userId, provider: "test", externalRef: `demo-${userId}`, createdAt: checkedAt, ...data },
    update: data,
  });
  // Massgebend ist die jüngste Prüfung; ältere Demo-fremde Prüfungen gibt es bei Demo-Konten nicht.
  await db.identityCheck.deleteMany({ where: { userId, id: { not: id } } });
}
