import type { ProfileAudience, ProviderStatus } from "@app/db";

/**
 * Fiktive Anbieterprofile (Entscheid 0023). Künstlernamen ohne Bezug zu echten
 * Personen; alle volljährig. Regionen nur aus den freigegebenen Referenzdaten
 * (Entscheid 0004): die fünf Städte und ihre Kantone. Orte ausserhalb der Städte
 * stehen als allgemeine Ortsangabe am Kanton (zum Beispiel «Winterthur»).
 */
export interface DemoRate {
  durationMinutes: number;
  priceChf: number;
  note?: string;
}

export type AvailabilityPattern = "abend" | "nachmittag" | "wochenende" | "flexibel" | "keine";

export interface DemoProvider {
  key: string;
  displayName: string;
  /** Region-Slugs aus den Referenzdaten. */
  regions: string[];
  locationLabel: string;
  languages: string[];
  shortDescription: string;
  /** Eigener Teil der Beschreibung; Einleitung und Schluss ergänzt `aboutText`. */
  about: string;
  rates: DemoRate[];
  status: ProviderStatus;
  visibility: ProfileAudience;
  allowMessages: boolean;
  allowBookingRequests: boolean;
  availability: AvailabilityPattern;
  images: number;
  /** Tage seit der Veröffentlichung, für «Neu» und die Sortierung. */
  publishedDaysAgo: number;
}

type Row = [
  key: string,
  displayName: string,
  regions: string[],
  locationLabel: string,
  languages: string[],
  shortDescription: string,
  about: string,
  rates: [number, number][],
  availability: AvailabilityPattern,
  images: number,
  publishedDaysAgo: number,
  extra?: Partial<Pick<DemoProvider, "status" | "visibility" | "allowMessages" | "allowBookingRequests">>,
];

const rows: Row[] = [
  ["lina", "Lina", ["stadt-zuerich"], "Kreis 4", ["de", "en"], "Ruhig, aufmerksam und gut organisiert. Termine am Abend.", "Ich mag klare Absprachen und eine entspannte Atmosphäre, in der man ankommen kann.", [[60, 300], [120, 550]], "abend", 5, 120],
  ["mara", "Mara", ["stadt-zuerich"], "Kreis 5", ["de", "it"], "Herzlich und unkompliziert, mit Sinn für gute Gespräche.", "Gespräche gehören für mich dazu. Ich nehme mir Zeit und höre zu.", [[60, 280], [90, 400], [180, 750]], "flexibel", 4, 80],
  ["noemi", "Noemi", ["stadt-zuerich", "zuerich"], "Oerlikon", ["de", "fr", "en"], "Gepflegt, diskret und zuverlässig. Dreisprachig.", "Ich arbeite selbständig und lege Wert auf Pünktlichkeit und Diskretion.", [[60, 320], [120, 600]], "abend", 4, 45],
  ["elena", "Elena", ["zuerich"], "Winterthur", ["de", "ru", "en"], "Elegant und warmherzig, gerne auch für längere Treffen.", "Ein gutes Essen und ein ruhiger Abend sind für mich der schönste Rahmen.", [[120, 580], [240, 1000]], "wochenende", 3, 200],
  ["sofia", "Sofia", ["stadt-zuerich"], "Seefeld", ["de", "es", "en"], "Lebensfroh, offen und mit einem Lächeln.", "Ich freue mich über Menschen, die neugierig sind und Humor mitbringen.", [[60, 300], [90, 420]], "nachmittag", 4, 12, { visibility: "MEMBERS" }],
  ["luca", "Luca", ["stadt-zuerich"], "Kreis 3", ["de", "it", "en"], "Aufmerksamer Begleiter mit ruhiger Art.", "Ich begleite gerne zu Anlässen oder einfach zu einem langen Spaziergang am See.", [[60, 250], [180, 650]], "abend", 3, 60],
  ["chiara", "Chiara", ["stadt-genf"], "Eaux-Vives", ["fr", "it", "en"], "Raffiniert und herzlich, mit Liebe zum Detail.", "Ich schätze Stil, gute Musik und Gespräche, die in die Tiefe gehen.", [[60, 350], [120, 650]], "abend", 5, 30],
  ["amelie", "Amélie", ["stadt-genf"], "Plainpalais", ["fr", "en"], "Charmant, entspannt und zuverlässig.", "Je parle aussi allemand un peu. Klare Absprachen sind mir wichtig.", [[60, 300], [120, 560]], "flexibel", 4, 95],
  ["ines", "Inès", ["genf"], "Carouge", ["fr", "pt", "en"], "Sanft und aufmerksam, mit viel Ruhe.", "Ich mag kleine Rituale: einen Tee zu Beginn und Zeit, die nicht drängt.", [[90, 420], [180, 780]], "nachmittag", 3, 5],
  ["valentina", "Valentina", ["stadt-genf", "genf"], "Pâquis", ["fr", "it", "es"], "Temperamentvoll und herzlich.", "Ich bin direkt, ehrlich und freue mich auf respektvolle Begegnungen.", [[60, 320]], "wochenende", 4, 150, { status: "PAUSED" }],
  ["jade", "Jade", ["basel"], "Kleinbasel", ["de", "fr", "en"], "Kreativ, verspielt und gut gelaunt.", "Ich male in meiner freien Zeit und erzähle gerne von Ausstellungen in der Stadt.", [[60, 280], [120, 520]], "abend", 5, 20],
  ["leonie", "Leonie", ["basel"], "St. Johann", ["de", "en"], "Natürlich, ruhig und zugewandt.", "Ich mag es unkompliziert und ehrlich. Schreib mir gerne vorab.", [[60, 260], [90, 360]], "flexibel", 3, 70],
  ["nico", "Nico", ["basel-stadt"], "Riehen", ["de", "en", "fr"], "Sportlich, humorvoll und respektvoll.", "Ich bin gerne draussen unterwegs und begleite auch zu Konzerten.", [[60, 240], [120, 440]], "nachmittag", 3, 110],
  ["romy", "Romy", ["basel"], "Gundeldingen", ["de", "it"], "Feinfühlig und klar in der Kommunikation.", "Gute Vorbereitung ist mir wichtig; deshalb kläre ich vorab gerne alle Fragen.", [[60, 300], [120, 560], [240, 1000]], "abend", 4, 3, { allowBookingRequests: false }],
  ["nora", "Nora", ["stadt-bern"], "Länggasse", ["de", "fr"], "Gelassen, warm und mit Berner Ruhe.", "Ich nehme mir Zeit und mag Begegnungen ohne Hektik.", [[60, 270], [120, 500]], "flexibel", 4, 55],
  ["mila", "Mila", ["stadt-bern"], "Breitenrain", ["de", "en", "pl"], "Offen, neugierig und herzlich.", "Ich liebe Bücher und gute Gespräche bei einem Glas Wein.", [[60, 290], [90, 400]], "abend", 4, 8],
  ["selin", "Selin", ["bern"], "Biel", ["de", "fr", "tr"], "Zweisprachig zwischen Biel und Bienne.", "Ich wechsle gerne zwischen den Sprachen und bin für Treffen in der ganzen Region offen.", [[60, 260], [120, 480]], "nachmittag", 3, 140],
  ["livia", "Livia", ["bern"], "Thun", ["de", "it", "en"], "Ruhig und stilvoll, am liebsten tagsüber.", "Der Blick auf die Berge beruhigt mich. Diese Ruhe gebe ich gerne weiter.", [[90, 380], [180, 700]], "wochenende", 3, 220, { status: "PAUSED" }],
  ["zoe", "Zoé", ["lausanne"], "Ouchy", ["fr", "en"], "Fröhlich, aufmerksam und zuverlässig.", "J'aime le lac et les longues soirées. Ich spreche auch etwas Deutsch.", [[60, 300], [120, 560]], "abend", 5, 25],
  ["clara", "Clara", ["lausanne", "waadt"], "Flon", ["fr", "de", "en"], "Elegant, gebildet und gut vorbereitet.", "Ich begleite gerne zu Anlässen und weiss mich in jeder Umgebung zu bewegen.", [[120, 600], [240, 1100]], "flexibel", 4, 160],
  ["ava", "Ava", ["waadt"], "Montreux", ["en", "fr"], "International, entspannt und herzlich.", "I am happy to meet in English. Klare Absprachen und Respekt stehen an erster Stelle.", [[60, 320], [120, 600]], "wochenende", 3, 40],
  ["mika", "Mika", ["waadt"], "Vevey", ["fr", "de"], "Ruhig, sanft und aufmerksam. Für alle Geschlechter.", "Ich empfange alle Menschen mit Respekt und Offenheit.", [[60, 260], [90, 360]], "nachmittag", 3, 90],
  ["alessia", "Alessia", ["stadt-zuerich"], "Wiedikon", ["it", "de", "en"], "Herzlich, italienisch und voller Energie.", "Ich bringe gute Laune mit und freue mich über Menschen, die das Leben geniessen.", [[60, 310], [120, 580]], "abend", 4, 16],
  ["sascha", "Sascha", ["stadt-bern", "bern"], "Altstadt", ["de", "en"], "Gepflegter Begleiter mit ruhiger Ausstrahlung.", "Ich höre gerne zu und lasse mich auf jede Begegnung neu ein.", [[60, 240], [120, 450]], "flexibel", 3, 65],
];

const AUDIENCE_DEFAULTS = { status: "PUBLISHED", visibility: "PUBLIC", allowMessages: true, allowBookingRequests: true } as const;

export const demoProviders: DemoProvider[] = rows.map(
  ([key, displayName, regions, locationLabel, languages, shortDescription, about, rates, availability, images, publishedDaysAgo, extra]) => ({
    key,
    displayName,
    regions,
    locationLabel,
    languages,
    shortDescription,
    about,
    rates: rates.map(([durationMinutes, priceChf]) => ({ durationMinutes, priceChf })),
    availability,
    images,
    publishedDaysAgo,
    ...AUDIENCE_DEFAULTS,
    ...extra,
  }),
);

/** Das Profil, das dem Login `demo-anbieter@demo.invalid` gehört. */
export const DEMO_LOGIN_PROVIDER = "lina";

const OPENINGS = [
  "Schön, dass du hier bist.",
  "Willkommen auf meinem Profil.",
  "Danke für dein Interesse.",
  "Hallo und herzlich willkommen.",
];

const VALUES = [
  "Respekt, Hygiene und Diskretion sind für mich selbstverständlich.",
  "Gegenseitiger Respekt und klare Grenzen machen eine Begegnung angenehm.",
  "Mir sind Ehrlichkeit, Pünktlichkeit und ein freundlicher Umgang wichtig.",
  "Ich treffe nur volljährige Menschen, die respektvoll und gepflegt sind.",
];

const PRACTICAL = [
  "Am einfachsten erreichst du mich über eine Nachricht hier auf der Plattform.",
  "Für Termine nutze bitte die Terminanfrage; ich melde mich so rasch wie möglich.",
  "Kurzfristige Anfragen sind manchmal möglich, eine Anfrage am Vortag ist mir lieber.",
];

/** Beschreibung in Deutsch: Einleitung, eigener Teil, Werte, Praktisches und der Hinweis «Demo-Profil, fiktiv.». */
export function aboutText(provider: DemoProvider, index: number): string {
  return [
    `${OPENINGS[index % OPENINGS.length]} ${provider.about}`,
    VALUES[index % VALUES.length],
    PRACTICAL[index % PRACTICAL.length],
    "Demo-Profil, fiktiv.",
  ].join("\n\n");
}
