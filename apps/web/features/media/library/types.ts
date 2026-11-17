import type { MediaStatus, MediaVisibility } from "@app/db";

/** Ein Medium, wie Bibliothek und Detailseite es im Browser brauchen. */
export interface LibraryItem {
  id: string;
  status: MediaStatus;
  visibility: MediaVisibility;
  isCover: boolean;
  /** Logo einer Organisation; bei Profilen immer false. */
  isLogo: boolean;
  altText: string | null;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  failureReason: string | null;
  moderationNote: string | null;
  /** Kleine Variante für das Raster; fehlt, solange es keine Varianten gibt. */
  thumbSrc: string | null;
  /** Link zur Detailseite; fehlt im Onboarding, wo das Studio noch nicht offen ist. */
  detailHref: string | null;
}

/**
 * Wem die Bibliothek gehört: dem eigenen Anbieterprofil oder einer
 * Organisation (Entscheid 0018). Organisationen haben Logo statt Sichtbarkeit.
 */
export type MediaScope = { kind: "profile" } | { kind: "organization"; org: string };

export const PROFILE_SCOPE: MediaScope = { kind: "profile" };

/** Feld `org` der Server Actions; fehlt es, gilt das eigene Profil. */
export function scopeInput(scope: MediaScope): { org?: string } {
  return scope.kind === "organization" ? { org: scope.org } : {};
}

export interface LibraryData {
  scope: MediaScope;
  /** Ohne das Recht «media.edit» sieht ein Mitglied der Organisation die Medien nur. */
  canEdit: boolean;
  items: LibraryItem[];
  quota: { used: number; max: number };
  hasUploadedBefore: boolean;
  canUpload: boolean;
}

/** Status, in denen Varianten vorliegen. */
export const WITH_VARIANTS: readonly MediaStatus[] = ["IN_REVIEW", "PUBLISHED", "CHANGES_REQUESTED", "BLOCKED"];
