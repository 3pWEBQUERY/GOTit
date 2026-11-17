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
