import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import {
  createAccount,
  query,
  signInAs,
  type FreshAccount,
} from "./admin-fixtures";

/**
 * Hilfen für die Specs zu Favoriten und gespeicherten Suchen (Entscheid 0013):
 * frische, erkennbar fiktive Mitglieder und öffentliche Profile per SQL.
 * Alles hängt an Konten, die `cleanup` samt Kaskade entfernt.
 */
export interface FictiveProvider {
  userId: string;
  profileId: string;
  slug: string;
  name: string;
}

/** Öffentliches Profil: Status, gültige Identität und freigegebene Erstprüfung, wie in profile-public.spec.ts. */
export async function createProvider(
  created: string[],
  status: "PUBLISHED" | "PAUSED" = "PUBLISHED",
): Promise<FictiveProvider> {
  const suffix = randomUUID().slice(0, 8);
  const name = `Favoritname ${suffix} Fiktiv`;
  const account = await createAccount(
    undefined,
    `Favoritkonto ${suffix} Fiktiv`,
  );
  created.push(account.id);
  const profileId = `e2e_fav_${suffix}`;
  const slug = `fiktiv-fav-${suffix}`;
  await query(
    `insert into provider_profile (id, "userId", slug, "displayName", status, visibility, description, "shortDescription", languages, "publishedAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'PUBLIC', 'Fiktive Beschreibung für einen Test der Favoriten. Sie ist lang genug für die Regel.', 'Ein fiktiver Satz.', '{de}', now(), now())`,
    [profileId, account.id, slug, name, status],
  );
  const [region] = await query<{ id: string }>(
    `select id from region where slug = 'stadt-zuerich'`,
  );
  await query(
    `insert into provider_region ("providerProfileId", "regionId") values ($1, $2)`,
    [profileId, region?.id],
  );
  await query(
    `insert into identity_check (id, "userId", provider, "externalRef", status, "ageOver18", "livenessPassed", "checkedAt", "expiresAt", "updatedAt")
     values ($1, $2, 'test', $3, 'APPROVED', true, true, now() - interval '20 days', now() + interval '300 days', now())`,
    [`e2e_fav_identity_${suffix}`, account.id, `e2e-ref-${randomUUID()}`],
  );
  await query(
    `insert into profile_review (id, "providerProfileId", "submittedAt", decision, "decidedAt") values ($1, $2, now() - interval '21 days', 'APPROVED', now())`,
    [`e2e_fav_review_${suffix}`, profileId],
  );
  return { userId: account.id, profileId, slug, name };
}

/** Frisches Mitglied, angemeldet. */
export async function signedInMember(
  page: Page,
  created: string[],
  baseURL?: string,
): Promise<FreshAccount> {
  const account = await createAccount(
    undefined,
    `Mitglied ${randomUUID().slice(0, 6)} Fiktiv`,
  );
  created.push(account.id);
  await signInAs(page, account, baseURL);
  return account;
}

/** Standardsammlung «Favoriten» des Kontos (leerer Name), bei Bedarf angelegt. */
export async function defaultCollection(userId: string): Promise<string> {
  const [existing] = await query<{ id: string }>(
    `select id from collection where "userId" = $1 and "isDefault"`,
    [userId],
  );
  if (existing) return existing.id;
  const id = `e2e_col_${randomUUID()}`;
  await query(
    `insert into collection (id, "userId", name, "isDefault", "updatedAt") values ($1, $2, '', true, now())`,
    [id, userId],
  );
  return id;
}

export async function ownCollection(
  userId: string,
  name: string,
): Promise<string> {
  const id = `e2e_col_${randomUUID()}`;
  await query(
    `insert into collection (id, "userId", name, "isDefault", "sortOrder", "updatedAt") values ($1, $2, $3, false, 1, now())`,
    [id, userId, name],
  );
  return id;
}

/** Legt Profile in eine Sammlung, in der gegebenen Reihenfolge von oben nach unten. */
export async function addEntries(
  collectionId: string,
  providers: readonly FictiveProvider[],
): Promise<void> {
  for (const [index, provider] of providers.entries()) {
    await query(
      `insert into favorite (id, "collectionId", "providerProfileId", "sortOrder") values ($1, $2, $3, $4)`,
      [`e2e_favitem_${randomUUID()}`, collectionId, provider.profileId, index],
    );
  }
}

/** Namen der Einträge in der angezeigten Reihenfolge. */
export async function entryNames(page: Page): Promise<string[]> {
  // Nur der Inhalt der Seite: Während des Streamens steht er kurz ein zweites Mal verborgen im Dokument.
  return page.locator("#inhalt [data-entry-grid] > li h2").allInnerTexts();
}

/** Wartet auf die Antwort der Server Action, die ein Klick auslöst; erst danach darf ein Test neu laden. */
export async function untilSaved(
  page: Page,
  action: () => Promise<void>,
): Promise<void> {
  const response = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "POST" &&
      candidate.request().headers()["next-action"] !== undefined,
  );
  await action();
  await response;
}
