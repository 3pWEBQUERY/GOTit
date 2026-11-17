import { SECTION_SCHEMAS, type EditorValues, type ProfileSection } from "./editor-schemas";

/**
 * Stand eines Abschnitts in der Liste des Editors (PRD v2 11.2): vollständig,
 * fehlt, oder `later`, wenn es noch nichts zu wählen gibt (Leistungen ohne
 * freigegebene Kategorien, Entscheid 0004).
 */
export type SectionStatus = "complete" | "missing" | "later";

export function sectionStatus(section: ProfileSection, values: EditorValues, categoriesAvailable: number): SectionStatus {
  switch (section) {
    case "offer":
      if (categoriesAvailable === 0) return "later";
      return values.offer.categoryIds.length > 0 ? "complete" : "missing";
    case "rates":
      return values.rates.rates.some((rate) => !rate.hidden) ? "complete" : "missing";
    case "basics":
    case "description":
    case "contact":
    case "visibility":
    case "regions":
      return SECTION_SCHEMAS[section].safeParse(values[section]).success ? "complete" : "missing";
  }
}
