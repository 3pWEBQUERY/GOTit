import type { Locale } from "@app/core/locale";
import { PROFILE_SECTIONS, type ProfileSection } from "@app/core/provider-profile/schemas";

/** Adressen der Abschnitte pro Sprache (PRD 7.6: `/studio/profil/[abschnitt]`, Panel `?bearbeiten=<abschnitt>`). */
const SECTION_SLUGS: Record<Locale, Record<ProfileSection, string>> = {
  de: { basics: "basis", description: "beschreibung", offer: "angebot", rates: "preise", contact: "kontakt", visibility: "sichtbarkeit", regions: "regionen" },
  fr: { basics: "base", description: "description", offer: "offre", rates: "tarifs", contact: "contact", visibility: "visibilite", regions: "regions" },
  it: { basics: "base", description: "descrizione", offer: "offerta", rates: "prezzi", contact: "contatto", visibility: "visibilita", regions: "regioni" },
  en: { basics: "basics", description: "description", offer: "offer", rates: "rates", contact: "contact", visibility: "visibility", regions: "regions" },
};

export { PROFILE_SECTIONS };

export function sectionSlug(locale: Locale, section: ProfileSection): string {
  return SECTION_SLUGS[locale][section];
}

/** Abschnitt zu einer Adresse; nimmt auch die Adresse einer anderen Sprache an, die Seite leitet dann um. */
export function sectionFromSlug(slug: string | undefined): ProfileSection | null {
  if (!slug) return null;
  const own = (locale: Locale) => PROFILE_SECTIONS.find((section) => SECTION_SLUGS[locale][section] === slug);
  for (const locale of Object.keys(SECTION_SLUGS) as Locale[]) {
    const found = own(locale);
    if (found) return found;
  }
  return null;
}

/** Name des Query-Parameters für das Seitenpanel auf `/p/[name]`, in allen Sprachen gleich. */
export const EDIT_PARAM = "bearbeiten";

