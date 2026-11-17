import type { ProfileSection } from "@app/core/provider-profile/schemas";

const SIMPLE: Record<string, string> = {
  displayName: "profil-anzeigename",
  shortDescription: "profil-kurzbeschreibung",
  languages: "profil-sprache-erste",
  description: "profil-beschreibung",
  categoryIds: "profil-leistung-erste",
  allowMessages: "profil-nachrichten",
  allowBookingRequests: "profil-terminanfragen",
  visibility: "profil-sichtbarkeit",
  locationLabel: "profil-ort",
  regionIds: "profil-region-erste",
  rates: "profil-preis-hinzufuegen",
};

const RATE_FIELDS: Record<string, string> = { durationMinutes: "dauer", priceChf: "preis", note: "hinweis" };

/** Bedienelement zu einem Fehlerpfad wie `rates.0.priceChf`, für Sprunglinks und den Fokus auf den ersten Fehler (PRD 13). */
export function fieldId(section: ProfileSection, path: string): string {
  const [head, index, field] = path.split(".");
  if (head === "rates" && index !== undefined) return `profil-${RATE_FIELDS[field ?? ""] ?? "preis"}-${index}`;
  if (head === "languages") return SIMPLE.languages ?? "";
  return SIMPLE[head ?? ""] ?? SIMPLE[firstField(section)] ?? "";
}

function firstField(section: ProfileSection): string {
  const first: Record<ProfileSection, string> = {
    basics: "displayName",
    description: "description",
    offer: "categoryIds",
    rates: "rates",
    contact: "allowMessages",
    visibility: "visibility",
    regions: "regionIds",
  };
  return first[section];
}
