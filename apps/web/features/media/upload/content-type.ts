import { MEDIA_CONTENT_TYPES, type MediaContentType } from "@app/core/media/schemas";

const BY_EXTENSION: Record<string, MediaContentType> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };

/**
 * Inhaltstyp, den der Browser für die Datei angibt; fehlt er (HEIC ausserhalb
 * von Safari), zählt die Endung. Der Worker prüft den echten Typ am Inhalt.
 */
export function uploadContentType(file: File): MediaContentType | null {
  const declared = file.type.toLowerCase();
  if ((MEDIA_CONTENT_TYPES as readonly string[]).includes(declared)) return declared as MediaContentType;
  if (declared !== "") return null;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[extension] ?? null;
}
