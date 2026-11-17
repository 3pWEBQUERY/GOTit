import { getDb, ProviderStatus, type Prisma } from "@app/db";
import { z } from "zod";
import { assertPermission } from "./permissions";

/**
 * Anbieterprofile im Admin (v2 7.8 `/admin/anbieter`): Liste mit Status,
 * letzter Prüfung, Regionen und Anlagedatum. Ohne Identitätsdaten; die
 * Prüfung meint den Prüffall des Profils (`profile_review`), nicht die
 * Identitätsprüfung.
 */
export const PROVIDER_PAGE_SIZE = 50;
const STATUSES = Object.values(ProviderStatus) as [ProviderStatus, ...ProviderStatus[]];

export const providerListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(STATUSES).optional(),
  cursor: z.string().min(1).max(64).optional(),
});
export type ProviderListInput = z.input<typeof providerListSchema>;

/** Neueste zuerst, 50 pro Seite. `nextCursor` ist die ID des letzten Profils der Seite. */
export async function listProvidersForAdmin(actorId: string, input: ProviderListInput = {}) {
  await assertPermission(actorId, "providers.view");
  const parsed = providerListSchema.safeParse(input);
  if (!parsed.success) return { providers: [], nextCursor: null };
  const { q, status, cursor } = parsed.data;
  const where: Prisma.ProviderProfileWhereInput[] = [];
  if (status) where.push({ status });
  if (q) {
    where.push({
      OR: [
        { id: q },
        { displayName: { contains: q, mode: "insensitive" } },
        { slug: { contains: q.toLowerCase() } },
        { user: { username: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  const rows = await getDb().providerProfile.findMany({
    where: { AND: where },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PROVIDER_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      userId: true,
      slug: true,
      displayName: true,
      status: true,
      createdAt: true,
      publishedAt: true,
      regions: { select: { region: { select: { nameDe: true, nameFr: true, nameIt: true, nameEn: true, kind: true } } } },
      reviews: { orderBy: { submittedAt: "desc" }, take: 1, select: { decision: true, submittedAt: true, decidedAt: true } },
    },
  });
  const page = rows.slice(0, PROVIDER_PAGE_SIZE);
  return {
    providers: page.map(({ regions, reviews, ...row }) => ({
      ...row,
      regions: regions.map((entry) => entry.region),
      // null: nie eingereicht. `decision` null: Prüfung offen.
      lastReview: reviews[0] ?? null,
    })),
    nextCursor: rows.length > PROVIDER_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
  };
}
export type AdminProviderSummary = Awaited<ReturnType<typeof listProvidersForAdmin>>["providers"][number];
