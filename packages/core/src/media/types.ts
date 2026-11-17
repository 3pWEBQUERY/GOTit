import type { MediaVisibility } from "@app/db";

/**
 * Ein freigegebenes Medium, wie die Profilseite es zeigt. `locked` ist gesetzt,
 * wenn der Betrachter die Bedingung nicht erfüllt (PRD v1 FR-MEDIA-004): Dann
 * gibt es keine URL und kein unscharfes Vorschaubild, nur die Bedingung
 * (PRD v2 10.1).
 */
export interface PublicMedia {
  id: string;
  altText: string | null;
  width: number;
  height: number;
  dominantColor: string | null;
  visibility: MediaVisibility;
  isCover: boolean;
  locked: boolean;
}
