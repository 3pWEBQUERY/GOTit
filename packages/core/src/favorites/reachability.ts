import { getDb } from "@app/db";
import type { Viewer } from "../identity/types";
import {
  publicState,
  type PublicState,
} from "../provider-profile/public-policy";

/**
 * Wie die Profilseite ein Profil für diesen Betrachter sieht: `ready`, `paused`,
 * `members-only` oder `null` (nicht erreichbar). Favoriten folgen dieser Regel,
 * damit eine Sammlung nie mehr zeigt als die Profilseite selbst.
 */
export async function profileStates(
  providerProfileIds: readonly string[],
  viewer: Viewer,
  now = new Date(),
): Promise<Map<string, PublicState | null>> {
  if (providerProfileIds.length === 0) return new Map();
  const db = getDb();
  const profiles = await db.providerProfile.findMany({
    where: { id: { in: [...providerProfileIds] } },
    select: {
      id: true,
      userId: true,
      status: true,
      visibility: true,
      reviews: {
        where: { kind: "PROFILE" },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { decision: true },
      },
    },
  });
  const checks = await db.identityCheck.findMany({
    where: { userId: { in: profiles.map((profile) => profile.userId) } },
    orderBy: { createdAt: "desc" },
    select: {
      userId: true,
      status: true,
      ageOver18: true,
      livenessPassed: true,
      expiresAt: true,
    },
  });
  const latest = new Map<string, (typeof checks)[number]>();
  for (const check of checks)
    if (!latest.has(check.userId)) latest.set(check.userId, check);
  const states = new Map<string, PublicState | null>();
  for (const profile of profiles) {
    const facts = {
      status: profile.status,
      visibility: profile.visibility,
      identity: latest.get(profile.userId) ?? null,
      latestProfileReview: profile.reviews[0]?.decision ?? null,
    };
    states.set(profile.id, publicState(facts, viewer, now));
  }
  for (const id of providerProfileIds)
    if (!states.has(id)) states.set(id, null);
  return states;
}
