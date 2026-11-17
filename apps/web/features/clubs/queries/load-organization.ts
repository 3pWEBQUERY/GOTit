import type { Locale } from "@app/core/locale";
import { getPublicOrganization } from "@app/core/organization";
import { cache } from "react";
import { getViewer } from "../../shell/queries/get-viewer";

/**
 * Die Organisation unter `/c/[slug]` für den Betrachter dieser Anfrage; einmal
 * pro Anfrage für Layout (404 vor dem Ladezustand), Metadaten und Seite. Nur
 * veröffentlichte Organisationen; was öffentlich ist, entscheidet der Kern.
 */
export const loadPublicOrganization = cache(
  async (slug: string, locale: Locale) =>
    getPublicOrganization(slug, await getViewer(), locale),
);
