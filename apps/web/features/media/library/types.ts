import type { MediaStatus, MediaVisibility } from "@app/db";

/** Ein Medium, wie Bibliothek und Detailseite es im Browser brauchen. */
export interface LibraryItem {
  id: string;
  status: MediaStatus;
  visibility: MediaVisibility;
  isCover: boolean;
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

export interface LibraryData {
  items: LibraryItem[];
  quota: { used: number; max: number };
  hasUploadedBefore: boolean;
  canUpload: boolean;
}

/** Status, in denen Varianten vorliegen. */
export const WITH_VARIANTS: readonly MediaStatus[] = ["IN_REVIEW", "PUBLISHED", "CHANGES_REQUESTED", "BLOCKED"];
