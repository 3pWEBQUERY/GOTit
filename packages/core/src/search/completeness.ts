/**
 * Profilvollständigkeit 0 bis 100 für das Ranking (PRD v1 FR-SEARCH-004). Sie
 * belohnt Angaben, die Suchenden helfen, nicht bezahlte Merkmale. Ein Tarif
 * ändert sie nie (PRD v2 11.7).
 */
export interface CompletenessFacts {
  hasShortDescription: boolean;
  descriptionLength: number;
  languageCount: number;
  serviceCount: number;
  rateCount: number;
  photoCount: number;
}

const DESCRIPTION_FULL = 200;

export function completeness(facts: CompletenessFacts): number {
  const parts = [
    facts.hasShortDescription ? 1 : 0,
    Math.min(facts.descriptionLength / DESCRIPTION_FULL, 1),
    facts.languageCount > 0 ? 1 : 0,
    facts.serviceCount > 0 ? 1 : 0,
    facts.rateCount > 0 ? 1 : 0,
    Math.min(facts.photoCount / 3, 1),
  ];
  return Math.round(
    (parts.reduce((sum, part) => sum + part, 0) / parts.length) * 100,
  );
}
