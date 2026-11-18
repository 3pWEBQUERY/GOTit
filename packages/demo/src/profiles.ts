import { Prisma, type PrismaClient } from "@app/db";
import { DEMO_LOGIN_PROVIDER, aboutText, type AvailabilityPattern, type DemoProvider } from "./data/providers";
import { LOGIN_EMAILS, profileId, profileSlug, providerEmail, providerUserId } from "./ids";
import { upsertAccount, upsertIdentityCheck } from "./accounts";

/**
 * Anbieterprofile mit allem, was Profilseite und Suche lesen (Entscheid 0023):
 * Regionen, Sprachen, Kategorien, Preise, freigegebene Erstprüfung, gültige
 * Identitätsprüfung und Kalender. Untergeordnete Listen werden bei jedem Lauf
 * ersetzt, damit ein zweiter Lauf denselben Stand ergibt.
 */
const DAY = 86_400_000;

const WINDOWS: Record<AvailabilityPattern, [number, number, number][]> = {
  abend: [2, 3, 4, 5, 6].map((day) => [day, 18 * 60, 23 * 60]),
  nachmittag: [1, 2, 3, 4, 5].map((day) => [day, 13 * 60, 19 * 60]),
  wochenende: [
    [5, 17 * 60, 23 * 60],
    [6, 12 * 60, 23 * 60],
    [0, 12 * 60, 20 * 60],
  ],
  flexibel: [1, 2, 3, 4, 5, 6].map((day) => [day, 10 * 60, 22 * 60]),
  keine: [],
};

export function windowsOf(pattern: AvailabilityPattern): [number, number, number][] {
  return WINDOWS[pattern];
}

export function providerAccountEmail(key: string): string {
  return key === DEMO_LOGIN_PROVIDER ? LOGIN_EMAILS.provider : providerEmail(key);
}

export interface SeededProfile {
  key: string;
  id: string;
  userId: string;
  slug: string;
}

/** Freigegebene Regionen nach Slug; fehlt eine, bricht der Lauf ab (Referenzdaten zuerst laden). */
async function regionIds(db: PrismaClient): Promise<Map<string, string>> {
  const rows = await db.region.findMany({ where: { approved: true }, select: { id: true, slug: true } });
  return new Map(rows.map((row) => [row.slug, row.id]));
}

export async function seedProfiles(db: PrismaClient, providers: readonly DemoProvider[], now: Date): Promise<SeededProfile[]> {
  const regions = await regionIds(db);
  // Kategorien werden nicht erfunden (Entscheid 0004): Demo-Profile nutzen die freigegebenen, falls es welche gibt.
  const categories = await db.category.findMany({ where: { approved: true }, orderBy: { sortOrder: "asc" }, select: { id: true } });
  const seeded: SeededProfile[] = [];
  for (const [index, provider] of providers.entries()) {
    const userId = providerUserId(provider.key);
    const id = profileId(provider.key);
    const slug = profileSlug(provider.key);
    await upsertAccount(db, { id: userId, email: providerAccountEmail(provider.key), name: provider.displayName, accountType: "PROVIDER" }, now);
    await upsertIdentityCheck(db, userId, now);
    const publishedAt = new Date(now.getTime() - provider.publishedDaysAgo * DAY);
    const content = {
      displayName: provider.displayName,
      status: provider.status,
      shortDescription: provider.shortDescription,
      description: aboutText(provider, index),
      languages: provider.languages,
      locationLabel: provider.locationLabel,
      allowMessages: provider.allowMessages,
      allowBookingRequests: provider.allowBookingRequests,
      visibility: provider.visibility,
      pendingChanges: Prisma.DbNull,
      onboardingSteps: ["identity", "regions", "profile", "media", "offer", "availability", "preview", "submit"],
    };
    await db.providerProfile.upsert({
      where: { id },
      create: { id, userId, slug, ...content, submittedAt: publishedAt, publishedAt, contentUpdatedAt: new Date(now.getTime() - Math.min(provider.publishedDaysAgo, 10) * DAY) },
      update: content,
    });

    await db.providerRegion.deleteMany({ where: { providerProfileId: id } });
    const wanted = provider.regions.map((slug) => {
      const regionId = regions.get(slug);
      if (!regionId) throw new Error(`Region «${slug}» fehlt oder ist nicht freigegeben; zuerst «pnpm db:seed» ausführen.`);
      return regionId;
    });
    await db.providerRegion.createMany({ data: wanted.map((regionId) => ({ providerProfileId: id, regionId })) });

    await db.providerService.deleteMany({ where: { providerProfileId: id } });
    if (categories.length > 0) {
      const count = Math.min(categories.length, 1 + (index % 3));
      const picked = Array.from({ length: count }, (_, offset) => categories[(index + offset * 2) % categories.length]?.id).filter((value): value is string => Boolean(value));
      await db.providerService.createMany({ data: [...new Set(picked)].map((categoryId) => ({ providerProfileId: id, categoryId })) });
    }

    await db.rateItem.deleteMany({ where: { providerProfileId: id } });
    await db.rateItem.createMany({
      data: provider.rates.map((rate, sortOrder) => ({ id: `${id}_rate_${sortOrder}`, providerProfileId: id, durationMinutes: rate.durationMinutes, priceChf: rate.priceChf, note: rate.note ?? null, sortOrder })),
    });

    // Erstprüfung freigegeben; ohne Prüferkonto, Begründung «Demo».
    const reviewId = `${id}_review`;
    await db.profileReview.upsert({
      where: { id: reviewId },
      create: { id: reviewId, providerProfileId: id, kind: "PROFILE", submittedAt: new Date(publishedAt.getTime() - DAY), decidedAt: publishedAt, decision: "APPROVED", reason: "Demo" },
      update: { decision: "APPROVED", reason: "Demo" },
    });

    await seedCalendar(db, id, provider.availability, index);
    seeded.push({ key: provider.key, id, userId, slug });
  }
  return seeded;
}

async function seedCalendar(db: PrismaClient, providerProfileId: string, pattern: AvailabilityPattern, index: number): Promise<void> {
  const settings = { timeZone: "Europe/Zurich", bufferMinutes: [0, 15, 30][index % 3] ?? 0, exclusiveBooking: true, requestTtlHours: 48, minNoticeHours: [2, 4, 12][index % 3] ?? 2 };
  await db.calendarSettings.upsert({ where: { providerProfileId }, create: { providerProfileId, ...settings }, update: settings });
  await db.availabilityWindow.deleteMany({ where: { providerProfileId } });
  await db.availabilityWindow.createMany({
    data: windowsOf(pattern).map(([weekday, startMinute, endMinute], position) => ({ id: `${providerProfileId}_window_${position}`, providerProfileId, weekday, startMinute, endMinute })),
  });
}
