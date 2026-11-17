import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";
import { uniqueEmail } from "./support/outbox";
import { expect } from "./support/test";
import { secretFromOtpauth, totp } from "./support/totp";

/**
 * Hilfen für die Admin-Specs: frische, erkennbar fiktive Konten mit interner
 * Rolle und Prüffälle direkt in der Datenbank. Die gemeinsamen Testkonten
 * bleiben unberührt; `cleanup` entfernt alles, was ein Test angelegt hat.
 */
export const PASSWORD = "nur-fuer-tests-0000";

export type InternalRole = "SUPER_ADMIN" | "PLATFORM_ADMIN" | "MODERATOR" | "TRUST_SAFETY" | "SUPPORT";

export interface FreshAccount {
  id: string;
  email: string;
  name: string;
}

export async function query<Row extends object>(sql: string, values: unknown[] = []): Promise<Row[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<Row>(sql, values)).rows;
  } finally {
    await client.end();
  }
}

/** Konto ohne 2FA, optional mit interner Rolle. */
export async function createAccount(role?: InternalRole, name = "Testadmin Fiktiv"): Promise<FreshAccount> {
  const id = `e2e_${randomUUID()}`;
  const email = uniqueEmail("admin");
  await query(`insert into "user" (id, name, email, "emailVerified", "ageConfirmedAt", "updatedAt") values ($1, $2, $3, true, now(), now())`, [id, name, email]);
  await query(`insert into account (id, "accountId", "providerId", "userId", password, "updatedAt") values ($1, $2, 'credential', $2, $3, now())`, [`${id}_credential`, id, await hashPassword(PASSWORD)]);
  if (role) await query(`insert into internal_role_assignment ("userId", role, "grantedBy") values ($1, $2, 'e2e')`, [id, role]);
  return { id, email, name };
}

/** Meldet die Seite über die Auth-API an; ersetzt eine bestehende Sitzung (mit Herkunft, wegen des CSRF-Schutzes). */
export async function signInAs(page: Page, account: FreshAccount, baseURL?: string): Promise<void> {
  const headers = baseURL ? { origin: new URL(baseURL).origin } : undefined;
  const response = await page.request.post("/api/auth/sign-in/email", { data: { email: account.email, password: PASSWORD }, headers });
  expect(response.ok(), `Anmeldung ${response.status()}`).toBe(true);
}

/** Richtet den zweiten Faktor über die Auth-API ein, wie in auth-sign-in.spec.ts. */
export async function enableTwoFactor(page: Page, baseURL: string | undefined): Promise<void> {
  const origin = new URL(baseURL ?? "http://localhost:3000").origin;
  const enable = await page.request.post("/api/auth/two-factor/enable", { data: { password: PASSWORD }, headers: { origin } });
  expect(enable.ok(), await enable.text()).toBe(true);
  const { totpURI } = (await enable.json()) as { totpURI: string };
  const verify = await page.request.post("/api/auth/two-factor/verify-totp", { data: { code: totp(secretFromOtpauth(totpURI)) }, headers: { origin } });
  expect(verify.ok(), await verify.text()).toBe(true);
}

/** Frisches Konto mit Rolle und eingerichteter 2FA, angemeldet. */
export async function signInAdmin(page: Page, baseURL: string | undefined, role: InternalRole, name?: string): Promise<FreshAccount> {
  const account = await createAccount(role, name);
  await signInAs(page, account);
  await enableTwoFactor(page, baseURL);
  return account;
}

export interface ReviewCaseFixture {
  userId: string;
  profileId: string;
  reviewId: string;
  displayName: string;
}

/**
 * Eingereichtes Anbieterprofil mit Identitätsprüfung und offenem Prüffall.
 * `identity: "expired"` legt eine abgelaufene Prüfung an.
 */
export async function createReviewCase(options: { identity?: "valid" | "expired"; submittedAt?: Date; displayName?: string } = {}): Promise<ReviewCaseFixture> {
  const suffix = randomUUID().slice(0, 8);
  const displayName = options.displayName ?? `Prüfprofil ${suffix} Fiktiv`;
  const owner = await createAccount(undefined, `Prüfkonto ${suffix} Fiktiv`);
  const profileId = `e2e_profile_${suffix}`;
  const reviewId = `e2e_review_${randomUUID()}`;
  const expires = options.identity === "expired" ? "now() - interval '2 days'" : "now() + interval '300 days'";
  await query(
    `insert into provider_profile (id, "userId", slug, "displayName", status, description, languages, "submittedAt", "updatedAt")
     values ($1, $2, $3, $4, 'SUBMITTED', 'Fiktive Beschreibung für einen Prüffall im Test, mit genug Zeichen für die Regeln.', '{de,fr}', now(), now())`,
    [profileId, owner.id, `pruefprofil-${suffix}`, displayName],
  );
  await query(`insert into rate_item (id, "providerProfileId", "durationMinutes", "priceChf", "sortOrder", "updatedAt") values ($1, $2, 60, 300, 0, now())`, [`e2e_rate_${suffix}`, profileId]);
  const region = (await query<{ id: string }>(`select id from region order by slug limit 1`))[0];
  if (region) await query(`insert into provider_region ("providerProfileId", "regionId") values ($1, $2)`, [profileId, region.id]);
  await query(
    `insert into identity_check (id, "userId", provider, "externalRef", status, "ageOver18", "livenessPassed", "checkedAt", "expiresAt", "updatedAt")
     values ($1, $2, 'test', $3, 'APPROVED', true, true, now() - interval '65 days', ${expires}, now())`,
    [`e2e_identity_${suffix}`, owner.id, `e2e-ref-${randomUUID()}`],
  );
  await query(`insert into profile_review (id, "providerProfileId", "submittedAt") values ($1, $2, $3)`, [reviewId, profileId, options.submittedAt ?? new Date()]);
  return { userId: owner.id, profileId, reviewId, displayName };
}

/** Entfernt Konten samt Profil, Prüfung und Fällen (Kaskade). Audit-Einträge bleiben, wie im Betrieb. */
export async function cleanup(userIds: readonly string[]): Promise<void> {
  if (userIds.length > 0) await query(`delete from "user" where id = any($1)`, [userIds]);
}

export async function reviewState(reviewId: string) {
  const rows = await query<{ decision: string | null; rule: string | null; reason: string | null; fieldNotes: Record<string, string>; status: string }>(
    `select r.decision, r.rule, r.reason, r."fieldNotes", p.status from profile_review r join provider_profile p on p.id = r."providerProfileId" where r.id = $1`,
    [reviewId],
  );
  return rows[0];
}

export async function auditEvents(reviewId: string, action: string) {
  return query<{ actorId: string; reason: string | null }>(`select "actorId", reason from audit_event where target = $1 and action = $2`, [`profile_review:${reviewId}`, action]);
}
