import type { OrganizationKind } from "@app/db";

/**
 * Fiktive Organisationen (Entscheid 0023): zwei Clubs und eine Agentur. UIDs
 * haben das richtige Format, aber eine ungültige Prüfziffer, damit sie nie einem
 * echten Unternehmen gehören. Keine Telefonnummern, Websites unter `.invalid`.
 */
export interface DemoLocation {
  key: string;
  name: string;
  description: string;
  region: string;
  areaLabel: string;
  /** [Wochentag 0 = Sonntag, Start, Ende] in Minuten seit Mitternacht. */
  hours: [number, number, number][];
}

export interface DemoOrganization {
  key: string;
  slug: string;
  name: string;
  kind: OrganizationKind;
  ownerKey: string;
  ownerName: string;
  description: string;
  legalName: string;
  uid: string;
  locations: DemoLocation[];
  /** Verknüpfte Profile (Schlüssel aus `demoProviders`) mit Standort. */
  providers: { key: string; location: string | null }[];
  images: number;
}

const evenings = (from: number, to: number, days: number[]): [number, number, number][] => days.map((day) => [day, from * 60, to * 60]);

export const demoOrganizations: DemoOrganization[] = [
  {
    key: "club-lumen",
    slug: "demo-club-lumen",
    name: "Club Lumen",
    kind: "CLUB",
    ownerKey: "club",
    ownerName: "Inhaberin Club Lumen",
    description:
      "Ein ruhiger, gepflegter Club mit warmem Licht, Lounge und Bar. Diskreter Empfang, freundliches Team und klare Hausregeln: Respekt, Einverständnis und Diskretion.\n\nDemo-Organisation, fiktiv.",
    legalName: "Lumen Demo GmbH",
    uid: "CHE-100.000.009",
    locations: [
      { key: "zuerich", name: "Lumen Zürich", description: "Lounge und Bar, Eingang im Hof.", region: "stadt-zuerich", areaLabel: "Kreis 4", hours: evenings(18, 23, [2, 3, 4, 5, 6]) },
      { key: "winterthur", name: "Lumen Winterthur", description: "Kleiner Ableger mit Bar.", region: "zuerich", areaLabel: "Winterthur", hours: evenings(19, 23, [4, 5, 6]) },
    ],
    providers: [
      { key: "lina", location: "zuerich" },
      { key: "mara", location: "zuerich" },
      { key: "alessia", location: "zuerich" },
      { key: "elena", location: "winterthur" },
    ],
    images: 3,
  },
  {
    key: "maison-azur",
    slug: "demo-maison-azur",
    name: "Maison Azur",
    kind: "CLUB",
    ownerKey: "club-2",
    ownerName: "Inhaber Maison Azur",
    description:
      "Kleines Haus am See mit Salon, Garten und Bar. Wir legen Wert auf eine entspannte Atmosphäre und einen respektvollen Umgang.\n\nDemo-Organisation, fiktiv.",
    legalName: "Azur Demo Sàrl",
    uid: "CHE-300.000.009",
    locations: [
      { key: "lausanne", name: "Maison Azur Lausanne", description: "Salon und Garten, nahe am See.", region: "lausanne", areaLabel: "Ouchy", hours: [...evenings(17, 23, [3, 4, 5, 6]), [0, 15 * 60, 20 * 60]] },
      { key: "genf", name: "Maison Azur Genève", description: "Bar und Salon.", region: "stadt-genf", areaLabel: "Eaux-Vives", hours: evenings(18, 24, [4, 5, 6]) },
    ],
    providers: [
      { key: "zoe", location: "lausanne" },
      { key: "clara", location: "lausanne" },
      { key: "chiara", location: "genf" },
      { key: "amelie", location: "genf" },
    ],
    images: 3,
  },
  {
    key: "agentur-nordlicht",
    slug: "demo-agentur-nordlicht",
    name: "Agentur Nordlicht",
    kind: "AGENCY",
    ownerKey: "agentur",
    ownerName: "Inhaberin Agentur Nordlicht",
    description:
      "Vermittlung von Begleitungen für Anlässe und Abende in Basel und Bern. Persönliche Beratung, verlässliche Absprachen und volle Diskretion.\n\nDemo-Organisation, fiktiv.",
    legalName: "Nordlicht Demo AG",
    uid: "CHE-200.000.009",
    locations: [{ key: "basel", name: "Nordlicht Basel", description: "Büro und Beratung nach Vereinbarung.", region: "basel", areaLabel: "Grossbasel", hours: evenings(10, 18, [1, 2, 3, 4, 5]) }],
    providers: [
      { key: "jade", location: "basel" },
      { key: "leonie", location: "basel" },
      { key: "nora", location: null },
      { key: "mila", location: null },
    ],
    images: 2,
  },
];
