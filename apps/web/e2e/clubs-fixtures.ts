import { randomUUID } from "node:crypto";
import { query } from "./admin-fixtures";
import { createProvider, type FictiveProvider } from "./messages-fixtures";
import { indexProfiles } from "./support/search-index";

/**
 * Fiktive Organisationen für die Specs der Clubseiten (Entscheid 0018), per
 * SQL wie nach der Freigabe durch die Moderation: veröffentlicht, mit
 * Standorten, Öffnungszeiten, Ausnahmen und Verknüpfungen. `cleanupClubs`
 * entfernt alles (Kaskade).
 */
export interface FictiveOrganization {
  id: string;
  slug: string;
  name: string;
}

export interface FictiveLocation {
  id: string;
  name: string;
}

const organizations: string[] = [];

export async function createOrganization(
  options: {
    name?: string;
    kind?: "CLUB" | "AGENCY";
    status?: "PUBLISHED" | "DRAFT";
    description?: string;
  } = {},
): Promise<FictiveOrganization> {
  const suffix = randomUUID().slice(0, 8);
  const id = `e2e_org_${suffix}`;
  const slug = `fiktiv-org-${suffix}`;
  const name = options.name ?? `Club ${suffix} Fiktiv`;
  const status = options.status ?? "PUBLISHED";
  await query(
    `insert into organization (id, slug, name, kind, status, description, website, phone, "publicEmail", "publishedAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'https://fiktiv.example', '+41 44 000 00 00', 'kontakt@fiktiv.example', $7, now())`,
    [
      id,
      slug,
      name,
      options.kind ?? "CLUB",
      status,
      options.description ?? "Fiktive Beschreibung eines Clubs für einen Test.",
      status === "PUBLISHED" ? new Date() : null,
    ],
  );
  if (status === "PUBLISHED")
    await query(
      `insert into organization_verification (id, "organizationId", "legalName", uid, "authorityConfirmed", status, "decidedAt")
       values ($1, $2, $3, 'CHE-000.000.000', true, 'APPROVED', now())`,
      [`e2e_orgver_${suffix}`, id, `${name} GmbH`],
    );
  organizations.push(id);
  return { id, slug, name };
}

/** Kalendertag in Europe/Zurich, `offset` Tage ab heute. */
export function zurichDay(offset = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = parts.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day + offset))
    .toISOString()
    .slice(0, 10);
}

/**
 * Standort mit Wochenzeiten Freitag 22:00 bis Samstag 02:00 und zwei
 * Ausnahmen: heute geöffnet 00:00–23:59 (damit «heute» unabhängig von der
 * Uhrzeit des Laufs offen ist) und in fünf Tagen geschlossen mit Notiz.
 */
export async function createLocation(
  organization: FictiveOrganization,
  options: { name?: string; region?: string; area?: string } = {},
): Promise<FictiveLocation> {
  const suffix = randomUUID().slice(0, 8);
  const id = `e2e_loc_${suffix}`;
  const name = options.name ?? `Standort ${suffix} Fiktiv`;
  const [region] = await query<{ id: string }>(
    `select id from region where slug = $1`,
    [options.region ?? "stadt-zuerich"],
  );
  await query(
    `insert into location (id, "organizationId", name, description, "regionId", "areaLabel", "updatedAt") values ($1, $2, $3, 'Fiktiver Standort für einen Test.', $4, $5, now())`,
    [id, organization.id, name, region?.id ?? null, options.area ?? "Kreis 4"],
  );
  await query(
    `insert into opening_hours (id, "locationId", weekday, "startMinute", "endMinute") values ($1, $3, 5, 1320, 1440), ($2, $3, 6, 0, 120)`,
    [`e2e_hours_a_${suffix}`, `e2e_hours_b_${suffix}`, id],
  );
  await query(
    `insert into opening_exception (id, "locationId", day, closed, "startMinute", "endMinute", note) values
     ($1, $3, $4, false, 0, 1439, null), ($2, $3, $5, true, null, null, 'Fiktiv: Betriebsferien')`,
    [
      `e2e_exc_a_${suffix}`,
      `e2e_exc_b_${suffix}`,
      id,
      zurichDay(0),
      zurichDay(5),
    ],
  );
  return { id, name };
}

export async function createLink(
  organization: FictiveOrganization,
  provider: { profileId: string },
  status: "INVITED" | "ACTIVE",
  options: { location?: FictiveLocation; message?: string } = {},
): Promise<string> {
  const id = `e2e_link_${randomUUID().slice(0, 8)}`;
  await query(
    `insert into organization_link (id, "organizationId", "providerProfileId", "locationId", status, "invitedById", message, "respondedAt") values ($1, $2, $3, $4, $5, 'e2e', $6, $7)`,
    [
      id,
      organization.id,
      provider.profileId,
      options.location?.id ?? null,
      status,
      options.message ?? null,
      status === "ACTIVE" ? new Date() : null,
    ],
  );
  return id;
}

/** Freigegebene, im Suchindex stehende Anbieter; `paused` wird nach dem Indexieren pausiert. */
export async function linkedProviders(
  created: string[],
  count: number,
  paused: number[] = [],
): Promise<FictiveProvider[]> {
  const providers: FictiveProvider[] = [];
  for (let index = 0; index < count; index += 1)
    providers.push(await createProvider(created));
  await indexProfiles(providers.map((provider) => provider.profileId));
  for (const index of paused) {
    const provider = providers[index];
    if (provider)
      await query(
        `update provider_profile set status = 'PAUSED' where id = $1`,
        [provider.profileId],
      );
  }
  return providers;
}

export async function cleanupClubs(): Promise<void> {
  if (organizations.length > 0)
    await query(`delete from organization where id = any($1)`, [organizations]);
}
