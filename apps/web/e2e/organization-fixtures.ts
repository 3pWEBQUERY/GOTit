import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import {
  createAccount,
  query,
  signInAs,
  type FreshAccount,
} from "./admin-fixtures";
import { expect } from "./support/test";

/**
 * Hilfen für die Specs der Organisationen (Entscheid 0018): fiktive
 * Organisationen mit Mitgliedern je Rolle und veröffentlichte Anbieterprofile
 * direkt in der Datenbank. `cleanupOrganizations` entfernt Organisationen
 * samt Standorten, Nachweisen, Verknüpfungen und Medien (Kaskade).
 */
export type Role =
  | "OWNER"
  | "LOCATION_MANAGER"
  | "MARKETING"
  | "EDITOR"
  | "SCHEDULING";

export interface FictiveOrganization {
  id: string;
  slug: string;
  name: string;
  members: Partial<Record<Role, FreshAccount>>;
}

export async function createOrganization(
  roles: readonly Role[],
  options: {
    status?: "DRAFT" | "PUBLISHED";
    created: string[];
    kind?: "CLUB" | "AGENCY";
  },
): Promise<FictiveOrganization> {
  const suffix = randomUUID().slice(0, 8);
  const id = `e2e_org_${suffix}`;
  const slug = `fiktiv-club-${suffix}`;
  const name = `Fiktiv Club ${suffix}`;
  await query(
    `insert into organization (id, slug, name, kind, status, "publishedAt", "updatedAt") values ($1, $2, $3, $4, $5, $6, now())`,
    [
      id,
      slug,
      name,
      options.kind ?? "CLUB",
      options.status ?? "DRAFT",
      options.status === "PUBLISHED" ? new Date() : null,
    ],
  );
  const members: FictiveOrganization["members"] = {};
  for (const role of roles) {
    const account = await createAccount(
      undefined,
      `Mitglied ${role} ${suffix} Fiktiv`,
    );
    options.created.push(account.id);
    await query(
      `update "user" set "accountType" = 'ORGANIZATION' where id = $1`,
      [account.id],
    );
    await query(
      `insert into organization_member (id, "organizationId", "userId", role) values ($1, $2, $3, $4)`,
      [`e2e_om_${randomUUID()}`, id, account.id, role],
    );
    members[role] = account;
  }
  return { id, slug, name, members };
}

export interface FictiveProvider {
  userId: string;
  profileId: string;
  slug: string;
  displayName: string;
}

/** Veröffentlichtes Anbieterprofil, das eine Organisation einladen kann. */
export async function createPublishedProvider(
  created: string[],
): Promise<FictiveProvider> {
  const suffix = randomUUID().slice(0, 8);
  const account = await createAccount(
    undefined,
    `Anbieterkonto ${suffix} Fiktiv`,
  );
  created.push(account.id);
  const profileId = `e2e_profil_${suffix}`;
  const slug = `fiktiv-anbieter-${suffix}`;
  const displayName = `Anbieterin ${suffix} Fiktiv`;
  await query(`update "user" set "accountType" = 'PROVIDER' where id = $1`, [
    account.id,
  ]);
  await query(
    `insert into provider_profile (id, "userId", slug, "displayName", status, "publishedAt", "updatedAt") values ($1, $2, $3, $4, 'PUBLISHED', now(), now())`,
    [profileId, account.id, slug, displayName],
  );
  const [region] = await query<{ id: string }>(
    `select id from region where approved order by slug limit 1`,
  );
  if (region)
    await query(
      `insert into provider_region ("providerProfileId", "regionId") values ($1, $2)`,
      [profileId, region.id],
    );
  return { userId: account.id, profileId, slug, displayName };
}

export async function cleanupOrganizations(
  organizationIds: string[],
  userIds: string[],
): Promise<void> {
  if (organizationIds.length > 0)
    await query(`delete from organization where id = any($1)`, [
      organizationIds.splice(0),
    ]);
  if (userIds.length > 0)
    await query(`delete from "user" where id = any($1)`, [userIds.splice(0)]);
}

/** Meldet ein Mitglied an und öffnet eine Seite der Organisation, nach der Hydrierung. */
export async function openAs(
  page: Page,
  account: FreshAccount,
  path: string,
): Promise<void> {
  await signInAs(page, account, `http://localhost:${process.env.PORT ?? 3000}`);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

/** Das Mitglied einer Rolle; fehlt es, ist der Test falsch aufgebaut. */
export function member(org: FictiveOrganization, role: Role): FreshAccount {
  const account = org.members[role];
  if (!account) throw new Error(`Kein Mitglied mit Rolle ${role}`);
  return account;
}
