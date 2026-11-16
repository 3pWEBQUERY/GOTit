import { getDb, type ProviderStatus } from "@app/db";
import type { Viewer } from "../identity";

export type SetPausedResult = { ok: true; status: ProviderStatus } | { ok: false; reason: "forbidden" | "conflict" };

/**
 * Pausiert das eigene Profil oder stellt es wieder online. Die Berechtigung
 * steckt in der Abfrage: Geändert wird nur das Profil des handelnden Kontos,
 * und nur aus dem dazu passenden Status. Ein gesperrtes oder nie freigegebenes
 * Profil kann so nicht öffentlich werden.
 */
export async function setOwnProfilePaused(viewer: Viewer, paused: boolean): Promise<SetPausedResult> {
  if (viewer.kind !== "account" || !viewer.provider) return { ok: false, reason: "forbidden" };
  const from: ProviderStatus = paused ? "PUBLISHED" : "PAUSED";
  const to: ProviderStatus = paused ? "PAUSED" : "PUBLISHED";
  const { count } = await getDb().providerProfile.updateMany({
    where: { userId: viewer.userId, status: from },
    data: { status: to },
  });
  return count === 1 ? { ok: true, status: to } : { ok: false, reason: "conflict" };
}
