import type { Locale } from "@app/core/locale";
import { getPublicProfile } from "@app/core/provider-profile";
import { cache } from "react";
import { getViewer } from "../../shell/queries/get-viewer";

/** Das Profil unter `/p/[name]` für den Betrachter dieser Anfrage; einmal pro Anfrage für Metadaten und Seite. */
export const loadPublicProfile = cache(async (slug: string, locale: Locale) => {
  const viewer = await getViewer();
  return getPublicProfile(slug, viewer, { locale });
});
