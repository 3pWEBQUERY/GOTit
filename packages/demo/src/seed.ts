import { availableParallelism } from "node:os";
import { reindexProfile } from "@app/core/search/indexer";
import { getDb, type PrismaClient } from "@app/db";
import { applyCredentials } from "./accounts";
import { seedActivity, seedMembers } from "./activity";
import { demoStatsProviders } from "./data/activity";
import { demoOrganizations } from "./data/organizations";
import { demoProviders } from "./data/providers";
import { LOGIN_EMAILS, mediaId, USER_PREFIX } from "./ids";
import { deleteMediaOf, syncMedia, type DemoMediaSpec, type MediaGroup, type MediaOutcome } from "./media";
import { seedOrganizations } from "./organizations";
import { seedProfiles } from "./profiles";
import { seedStats } from "./stats";

/**
 * Lädt den Demo-Datensatz (Entscheid 0023). Wiederholbar: feste IDs, ein
 * zweiter Lauf aktualisiert und verarbeitet nur fehlende Bilder. Die Prüfung
 * der Umgebung macht der Aufrufer (`run.ts`, Tests).
 */
export interface SeedOptions {
  now?: Date;
  /** Passwort aller Demo-Konten; null entfernt Passwörter und Sitzungen. */
  password: string | null;
  /** Höchstzahl Bilder pro Profil oder Organisation; nur für schnelle Tests. */
  maxImagesPerOwner?: number;
  /** Gleichzeitig verarbeitete Bilder; Standard: Anzahl Kerne, höchstens 4. */
  mediaConcurrency?: number;
  /** Zeitgrenze für die Bildverarbeitung in Sekunden; der Rest folgt beim nächsten Lauf. */
  mediaBudgetSeconds?: number;
  log?: (line: string) => void;
}

export interface SeedSummary {
  providers: number;
  published: number;
  organizations: number;
  members: number;
  reviews: number;
  openRequests: number;
  conversations: number;
  statEvents: number;
  media: MediaOutcome;
  indexed: number;
  logins: { email: string; role: string }[];
}

export async function seedDemo(options: SeedOptions): Promise<SeedSummary> {
  const db = getDb();
  const now = options.now ?? new Date();
  const log = options.log ?? (() => undefined);
  const limit = options.maxImagesPerOwner ?? Number.POSITIVE_INFINITY;

  log("Konten und Profile …");
  const profiles = await seedProfiles(db, demoProviders, now);
  const memberIds = await seedMembers(db, now);
  const organizations = await seedOrganizations(db, demoOrganizations, now);

  log("Bilder (beim ersten Lauf einige Minuten) …");
  const groups: MediaGroup[] = [];
  for (const [index, profile] of profiles.entries()) {
    const provider = demoProviders[index];
    if (!provider) continue;
    const count = Math.min(provider.images, limit);
    const specs: DemoMediaSpec[] = Array.from({ length: count }, (_, position) => ({
      id: mediaId(provider.key, position),
      ownerUserId: profile.userId,
      owner: { providerProfileId: profile.id },
      imageKey: `profile:${provider.key}:${position}`,
      shape: "portrait",
      sortOrder: position,
      // Bei jedem vierten Profil ist das letzte Bild nur für Mitglieder (PRD v1 FR-MEDIA-004).
      visibility: index % 4 === 1 && position === count - 1 && count >= 3 ? "MEMBERS" : "PUBLIC",
      isCover: position === 0,
      isLogo: false,
    }));
    groups.push({ owner: { providerProfileId: profile.id }, specs });
  }
  for (const [index, organization] of organizations.entries()) {
    const data = demoOrganizations[index];
    if (!data) continue;
    const count = Math.min(data.images, limit);
    const specs: DemoMediaSpec[] = Array.from({ length: count }, (_, position) => ({
      id: mediaId(data.key, position),
      ownerUserId: organization.ownerUserId,
      owner: { organizationId: organization.id },
      imageKey: `organization:${data.key}:${position}`,
      shape: position === 0 ? "square" : "portrait",
      sortOrder: position,
      visibility: "PUBLIC",
      isCover: position === 1 || count === 1,
      isLogo: position === 0 && count > 1,
    }));
    groups.push({ owner: { organizationId: organization.id }, specs });
  }
  const media = await syncMedia(db, groups, now, {
    concurrency: options.mediaConcurrency ?? Math.min(4, availableParallelism()),
    ...(options.mediaBudgetSeconds ? { deadline: Date.now() + options.mediaBudgetSeconds * 1000 } : {}),
  });

  log("Aktivität und Kennzahlen …");
  const activity = await seedActivity(db, demoProviders, now);
  const statEvents = await seedStats(db, demoStatsProviders, now);

  const userIds = [...profiles.map((profile) => profile.userId), ...memberIds, ...organizations.map((organization) => organization.ownerUserId)];
  await applyCredentials(db, userIds, options.password);

  // Suchindex direkt wie der nächtliche Neuaufbau, nicht über die Queue.
  let indexed = 0;
  for (const profile of profiles) if ((await reindexProfile(profile.id, now)) === "indexed") indexed += 1;

  await db.auditEvent.create({
    data: { actorId: null, action: "demo.seeded", target: "demo", reason: `Demo-Daten geladen: ${profiles.length} Profile, ${organizations.length} Organisationen, ${memberIds.length} Mitglieder.` },
  });

  return {
    providers: profiles.length,
    published: demoProviders.filter((provider) => provider.status === "PUBLISHED").length,
    organizations: organizations.length,
    members: memberIds.length,
    ...activity,
    statEvents,
    media,
    indexed,
    logins: [
      { email: LOGIN_EMAILS.member, role: "Mitglied" },
      { email: LOGIN_EMAILS.provider, role: "Anbieterin (Profil «Lina»)" },
      { email: LOGIN_EMAILS.club, role: "Inhaberin «Club Lumen»" },
    ],
  };
}

export interface ResetSummary {
  users: number;
  organizations: number;
  media: number;
}

/** Entfernt alle Demo-Daten: Bilder im Speicher, Organisationen mit Slug `demo-` und Konten mit ID `demo_` samt allem, was an ihnen hängt. */
export async function resetDemo(db: PrismaClient = getDb()): Promise<ResetSummary> {
  const users = (await db.user.findMany({ where: { id: { startsWith: USER_PREFIX } }, select: { id: true } })).map((user) => user.id);
  const media = await deleteMediaOf(db, users);
  const organizations = await db.organization.deleteMany({ where: { id: { startsWith: "demo_orgn_" }, slug: { startsWith: "demo-" } } });
  const deleted = await db.user.deleteMany({ where: { id: { in: users } } });
  if (deleted.count > 0 || organizations.count > 0) {
    await db.auditEvent.create({ data: { actorId: null, action: "demo.reset", target: "demo", reason: `Demo-Daten entfernt: ${deleted.count} Konten, ${organizations.count} Organisationen, ${media} Bilder.` } });
  }
  return { users: deleted.count, organizations: organizations.count, media };
}
