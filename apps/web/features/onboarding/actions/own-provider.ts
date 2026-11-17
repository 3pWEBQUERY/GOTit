import { getViewer } from "../../shell/queries/get-viewer";

/**
 * Autorisierung jeder Onboarding-Aktion: angemeldet und mit eigener
 * Anbieterrolle. Die Domänenfunktionen arbeiten nur auf dem Profil dieser
 * Person; eine fremde Profil-ID nimmt keine Aktion entgegen.
 */
export async function ownProviderUserId(): Promise<string | null> {
  const viewer = await getViewer();
  if (viewer.kind !== "account" || !viewer.provider || viewer.provider.status === "ARCHIVED") return null;
  return viewer.userId;
}
