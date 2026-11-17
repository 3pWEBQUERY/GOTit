import { randomUUID } from "node:crypto";
import type { Browser, BrowserContextOptions, Page } from "@playwright/test";
import {
  createAccount,
  query,
  signInAs,
  type FreshAccount,
} from "./admin-fixtures";
import { testClientIp } from "./support/test";

/**
 * Hilfen für die Specs des Messengers (Entscheid 0014): frische, erkennbar
 * fiktive Mitglieder und Anbieter per SQL, jeweils in einem eigenen
 * Browser-Kontext angemeldet. `cleanup` aus admin-fixtures entfernt alles
 * über die Kaskade der Konten.
 */
export interface FictiveProvider extends FreshAccount {
  profileId: string;
  slug: string;
  displayName: string;
}

export async function createMember(
  created: string[],
  username?: string,
): Promise<FreshAccount> {
  const account = await createAccount(
    undefined,
    `Mitglied ${randomUUID().slice(0, 6)} Fiktiv`,
  );
  created.push(account.id);
  if (username)
    await query(`update "user" set username = $2 where id = $1`, [
      account.id,
      username,
    ]);
  return account;
}

/** Öffentliches Profil mit gültiger Identität und freigegebener Erstprüfung; Nachrichten erlaubt. */
export async function createProvider(
  created: string[],
  options: { allowMessages?: boolean } = {},
): Promise<FictiveProvider> {
  const suffix = randomUUID().slice(0, 8);
  const displayName = `Chatprofil ${suffix} Fiktiv`;
  const account = await createAccount(undefined, `Chatkonto ${suffix} Fiktiv`);
  created.push(account.id);
  const profileId = `e2e_msg_${suffix}`;
  const slug = `fiktiv-chat-${suffix}`;
  await query(
    `insert into provider_profile (id, "userId", slug, "displayName", status, visibility, description, "shortDescription", languages, "allowMessages", "publishedAt", "updatedAt")
     values ($1, $2, $3, $4, 'PUBLISHED', 'PUBLIC', 'Fiktive Beschreibung für einen Test des Messengers. Sie ist lang genug für die Regel.', 'Ein fiktiver Satz.', '{de}', $5, now(), now())`,
    [profileId, account.id, slug, displayName, options.allowMessages ?? true],
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
    [`e2e_msg_identity_${suffix}`, account.id, `e2e-ref-${randomUUID()}`],
  );
  await query(
    `insert into profile_review (id, "providerProfileId", "submittedAt", decision, "decidedAt") values ($1, $2, now() - interval '21 days', 'APPROVED', now())`,
    [`e2e_msg_review_${suffix}`, profileId],
  );
  return { ...account, profileId, slug, displayName };
}

/** Unterhaltung mit Nachrichten per SQL; `minutesAgo` legt die Reihenfolge fest. */
export async function createConversation(
  member: FreshAccount,
  provider: FictiveProvider,
  messages: {
    from: "member" | "provider";
    body: string;
    minutesAgo: number;
  }[] = [],
  options: { providerRead?: boolean } = {},
): Promise<string> {
  const id = `e2e_conv_${randomUUID()}`;
  const last =
    messages.length > 0
      ? Math.min(...messages.map((message) => message.minutesAgo))
      : 0;
  await query(
    `insert into conversation (id, "providerProfileId", "memberUserId", "lastMessageAt") values ($1, $2, $3, now() - make_interval(mins => $4))`,
    [id, provider.profileId, member.id, last],
  );
  await query(
    `insert into conversation_participant ("conversationId", "userId", role, "lastReadAt") values ($1, $2, 'MEMBER', now()), ($1, $3, 'PROVIDER', ${options.providerRead ? "now()" : "null"})`,
    [id, member.id, provider.id],
  );
  for (const message of messages)
    await query(
      `insert into message (id, "conversationId", "senderId", body, "clientId", "createdAt") values ($1, $2, $3, $4, $5, now() - make_interval(mins => $6))`,
      [
        `e2e_msg_${randomUUID()}`,
        id,
        message.from === "member" ? member.id : provider.id,
        message.body,
        `e2e${randomUUID().replaceAll("-", "")}`,
        message.minutesAgo,
      ],
    );
  return id;
}

export async function setReadReceipts(
  userId: string,
  on: boolean,
): Promise<void> {
  await query(
    `insert into user_preference ("userId", "readReceipts", "updatedAt") values ($1, $2, now()) on conflict ("userId") do update set "readReceipts" = $2`,
    [userId, on],
  );
}

/** Eigener Browser-Kontext mit eigener Client-Adresse, angemeldet. */
export async function signedInPage(
  browser: Browser,
  account: FreshAccount,
  baseURL: string | undefined,
  options: BrowserContextOptions = {},
): Promise<Page> {
  const context = await browser.newContext({
    ...options,
    extraHTTPHeaders: { "x-real-ip": testClientIp() },
  });
  const page = await context.newPage();
  await signInAs(page, account, baseURL);
  return page;
}

/** Zeile der Unterhaltung in der Liste. */
export function inboxRow(page: Page, name: string) {
  return page
    .getByRole("navigation", { name: "Unterhaltungen" })
    .locator(":scope > ul > li")
    .filter({ has: page.getByRole("link", { name: new RegExp(name) }) });
}

/** Verlauf der geöffneten Unterhaltung. */
export function threadLog(page: Page) {
  return page.getByRole("log");
}

export async function messageCount(conversationId: string): Promise<number> {
  const [row] = await query<{ count: string }>(
    `select count(*)::text as count from message where "conversationId" = $1`,
    [conversationId],
  );
  return Number(row?.count ?? 0);
}
