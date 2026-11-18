import { randomBytes, randomUUID } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import { createAccount, query, type FreshAccount } from "./admin-fixtures";
import { indexProfiles } from "./support/search-index";
import { confirmAge } from "./support/session";
import { testClientIp } from "./support/test";

/**
 * Fiktive, suchbare Profile für die Specs der Suche (Entscheid 0013). Jedes
 * Profil trägt ein gemeinsames Kennwort im Namen; eine Suche nach diesem Wort
 * sieht nur die Profile ihres Tests, auch wenn andere Specs parallel laufen.
 */
export interface SearchProviderOptions {
  status?: "PUBLISHED" | "PAUSED" | "SUSPENDED" | "RESTRICTED";
  visibility?: "PUBLIC" | "MEMBERS";
  region?: string;
  languages?: string[];
  /** Günstigster Preis in CHF; `null`: keine Preise. */
  price?: number | null;
  publishedDaysAgo?: number;
  categoryId?: string;
  /** Reihenfolge innerhalb der Gruppe, landet im Namen («Kennwort 03 …»). */
  index?: number;
}

export interface SearchProvider {
  profileId: string;
  slug: string;
  name: string;
  /** Konto hinter dem Profil, zum Anmelden als Anbieter. */
  account: FreshAccount;
}

/**
 * Neues Kennwort für einen Test aus zufälligen Buchstaben, zum Beispiel
 * «Qzvkrhwmtb». Kein gemeinsamer Wortanfang: Die Wortähnlichkeit der Suche
 * (Tippfehler im Namen) fände sonst die Profile anderer Tests.
 */
export function keyword(): string {
  const letters = Array.from(randomBytes(10), (byte) =>
    String.fromCharCode(97 + (byte % 26)),
  ).join("");
  return `${letters[0]?.toUpperCase()}${letters.slice(1)}`;
}

export async function searchProvider(
  created: string[],
  word: string,
  options: SearchProviderOptions = {},
): Promise<SearchProvider> {
  const suffix = randomUUID().slice(0, 8);
  const position = String(options.index ?? 0).padStart(2, "0");
  const name = `${word} ${position} ${suffix} Fiktiv`;
  const account = await createAccount(undefined, `Suchkonto ${suffix} Fiktiv`);
  created.push(account.id);
  const profileId = `e2e_suche_${suffix}`;
  const slug = `fiktiv-suche-${suffix}`;
  const days = options.publishedDaysAgo ?? 60;
  await query(
    `insert into provider_profile (id, "userId", slug, "displayName", status, visibility, description, "shortDescription", languages, "publishedAt", "contentUpdatedAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'Fiktive Beschreibung für einen Test der Suche. Sie ist lang genug für die Regel.', 'Ein fiktiver Satz.', $7, now() - make_interval(days => $8), now() - make_interval(days => $8), now())`,
    [
      profileId,
      account.id,
      slug,
      name,
      options.status ?? "PUBLISHED",
      options.visibility ?? "PUBLIC",
      options.languages ?? ["de"],
      days,
    ],
  );
  const [region] = await query<{ id: string }>(
    `select id from region where slug = $1`,
    [options.region ?? "stadt-zuerich"],
  );
  await query(
    `insert into provider_region ("providerProfileId", "regionId") values ($1, $2)`,
    [profileId, region?.id],
  );
  if (options.price !== null)
    await query(
      `insert into rate_item (id, "providerProfileId", "durationMinutes", "priceChf", "sortOrder", "updatedAt") values ($1, $2, 60, $3, 0, now())`,
      [`e2e_suche_rate_${suffix}`, profileId, options.price ?? 300],
    );
  if (options.categoryId)
    await query(
      `insert into provider_service ("providerProfileId", "categoryId") values ($1, $2)`,
      [profileId, options.categoryId],
    );
  await query(
    `insert into identity_check (id, "userId", provider, "externalRef", status, "ageOver18", "livenessPassed", "checkedAt", "expiresAt", "updatedAt")
     values ($1, $2, 'test', $3, 'APPROVED', true, true, now() - interval '20 days', now() + interval '300 days', now())`,
    [`e2e_suche_identity_${suffix}`, account.id, `e2e-ref-${randomUUID()}`],
  );
  await query(
    `insert into profile_review (id, "providerProfileId", "submittedAt", decision, "decidedAt") values ($1, $2, now() - interval '70 days', 'APPROVED', now())`,
    [`e2e_suche_review_${suffix}`, profileId],
  );
  return { profileId, slug, name, account };
}

/** Legt mehrere Profile an und wartet, bis alle im Suchindex stehen. */
export async function indexedProviders(
  created: string[],
  word: string,
  list: readonly SearchProviderOptions[],
): Promise<SearchProvider[]> {
  const providers: SearchProvider[] = [];
  for (const [index, options] of list.entries())
    providers.push(await searchProvider(created, word, { index, ...options }));
  await indexProfiles(providers.map((provider) => provider.profileId));
  return providers;
}

/** Freigegebene Kategorie nur für einen Test; wird mit `removeCategory` entfernt. */
export async function testCategory(): Promise<{
  id: string;
  slug: string;
  name: string;
}> {
  const suffix = randomUUID().slice(0, 8);
  const category = {
    id: `e2e_kat_${suffix}`,
    slug: `fiktiv-kategorie-${suffix}`,
    name: `Kategorie ${suffix} Fiktiv`,
  };
  await query(
    `insert into category (id, slug, "nameDe", "nameFr", "nameIt", "nameEn", approved, "sortOrder", "updatedAt") values ($1, $2, $3, $3, $3, $3, true, 900, now())`,
    [category.id, category.slug, category.name],
  );
  return category;
}

export async function removeCategory(id: string): Promise<void> {
  await query(`delete from provider_service where "categoryId" = $1`, [id]);
  await query(`delete from category where id = $1`, [id]);
}

/** Besucher mit bestätigter Altersprüfung in einem eigenen Kontext, mit eigener Client-Adresse. */
export async function visitor(
  browser: Browser,
  path: string,
  viewport?: { width: number; height: number },
): Promise<Page> {
  const context = await browser.newContext({
    ...(viewport ? { viewport } : {}),
    extraHTTPHeaders: { "x-real-ip": testClientIp() },
    locale: "de-CH",
    timezoneId: "Europe/Zurich",
  });
  const page = await context.newPage();
  await confirmAge(page, path);
  return page;
}

/** Namen der Karten in der angezeigten Reihenfolge. */
export async function hitNames(page: Page): Promise<string[]> {
  return page.locator("#inhalt [data-search-results] > li h3").allInnerTexts();
}
