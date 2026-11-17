import { getViewer } from "../../shell/queries/get-viewer";

/**
 * Wer Medien verwalten darf: angemeldet und mit eigenem Anbieterprofil. Der
 * Kern prüft Eigentum und Status jedes Mediums zusätzlich selbst.
 */
export async function mediaOwnerId(): Promise<string | null> {
  const viewer = await getViewer();
  if (viewer.kind !== "account" || !viewer.provider || viewer.provider.status === "ARCHIVED") return null;
  return viewer.userId;
}

/**
 * Wer handelt und für wen (Entscheid 0018): mit `org` für eine Organisation,
 * deren Recht «media.edit» der Kern prüft; sonst für das eigene Profil.
 */
export async function mediaActor(input: unknown): Promise<{ userId: string; org: string | null } | null> {
  const org = typeof input === "object" && input !== null && "org" in input ? (input as { org: unknown }).org : undefined;
  if (org === undefined) {
    const userId = await mediaOwnerId();
    return userId ? { userId, org: null } : null;
  }
  if (typeof org !== "string" || !/^[a-z0-9-]{1,80}$/.test(org)) return null;
  const viewer = await getViewer();
  return viewer.kind === "account" ? { userId: viewer.userId, org } : null;
}
