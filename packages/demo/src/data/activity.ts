/**
 * Fiktive Mitglieder und ihre Aktivität (Entscheid 0023): Bewertungen nach
 * stattgefundenen Terminen, Unterhaltungen, offene Anfragen und Favoriten.
 * Texte sind sachlich und ohne intime Details, wie es der Hinweis über dem
 * Bewertungsfeld verlangt (PRD v2 12.1).
 */
export interface DemoMember {
  key: string;
  name: string;
}

/** `mitglied` ist das Login `demo-mitglied@demo.invalid`. */
export const demoMembers: DemoMember[] = [
  { key: "mitglied", name: "Adrian" },
  { key: "mitglied-02", name: "Stefan" },
  { key: "mitglied-03", name: "Reto" },
  { key: "mitglied-04", name: "Patrick" },
  { key: "mitglied-05", name: "Daniel" },
  { key: "mitglied-06", name: "Yves" },
  { key: "mitglied-07", name: "Marco" },
  { key: "mitglied-08", name: "Andrea" },
  { key: "mitglied-09", name: "Sandro" },
  { key: "mitglied-10", name: "Martin" },
];

export interface DemoReview {
  provider: string;
  member: string;
  daysAgo: number;
  /** Kommunikation, Zuverlässigkeit der Angaben, Organisation, Gesamteindruck. */
  ratings: [number, number, number, number];
  text: string;
  response?: string;
}

export const demoReviews: DemoReview[] = [
  { provider: "lina", member: "mitglied", daysAgo: 21, ratings: [5, 5, 5, 5], text: "Sehr freundliche und klare Kommunikation vorab. Alles war so, wie es im Profil beschrieben ist. Pünktlich und angenehm.", response: "Danke für die freundlichen Worte und die gute Absprache." },
  { provider: "lina", member: "mitglied-02", daysAgo: 48, ratings: [5, 4, 5, 5], text: "Unkomplizierte Terminvereinbarung, ruhige Atmosphäre und ein sehr respektvoller Umgang." },
  { provider: "lina", member: "mitglied-05", daysAgo: 75, ratings: [4, 5, 4, 4], text: "Gute Organisation und verlässliche Angaben. Die Antwort auf meine Anfrage kam schnell." },
  { provider: "mara", member: "mitglied-03", daysAgo: 12, ratings: [5, 5, 4, 5], text: "Herzlich und aufmerksam. Die Absprachen im Chat waren klar und wurden eingehalten." },
  { provider: "mara", member: "mitglied-06", daysAgo: 40, ratings: [4, 4, 4, 4], text: "Angenehmer Abend mit guten Gesprächen. Terminbestätigung kam zuverlässig." },
  { provider: "noemi", member: "mitglied-04", daysAgo: 9, ratings: [5, 5, 5, 5], text: "Sehr diskret und professionell. Profilangaben stimmen, Kommunikation auf Französisch und Deutsch problemlos." },
  { provider: "chiara", member: "mitglied", daysAgo: 33, ratings: [5, 5, 5, 4], text: "Stilvoll und herzlich. Die Organisation war tadellos, alles wie abgesprochen." },
  { provider: "chiara", member: "mitglied-07", daysAgo: 60, ratings: [4, 5, 5, 5], text: "Schnelle Antwort, klare Preise und ein sehr angenehmer Umgang.", response: "Merci! Es hat mich gefreut." },
  { provider: "jade", member: "mitglied-08", daysAgo: 15, ratings: [5, 4, 5, 5], text: "Kreativ, gut gelaunt und sehr zuverlässig. Die Zeit verging wie im Flug." },
  { provider: "jade", member: "mitglied-09", daysAgo: 52, ratings: [4, 4, 5, 4], text: "Alles unkompliziert und freundlich. Gerne wieder." },
  { provider: "nora", member: "mitglied-10", daysAgo: 27, ratings: [5, 5, 5, 5], text: "Ruhig, warm und sehr gut organisiert. Die Angaben im Profil sind zutreffend." },
  { provider: "zoe", member: "mitglied-02", daysAgo: 19, ratings: [5, 5, 4, 5], text: "Fröhlich und aufmerksam. Die Kommunikation auf Englisch klappte bestens." },
  { provider: "clara", member: "mitglied-05", daysAgo: 66, ratings: [5, 5, 5, 5], text: "Sehr elegante Begleitung zu einem Anlass, perfekt vorbereitet und pünktlich." },
  { provider: "mila", member: "mitglied-06", daysAgo: 6, ratings: [4, 5, 4, 5], text: "Offen und herzlich, die Terminanfrage wurde schnell beantwortet." },
  { provider: "alessia", member: "mitglied-07", daysAgo: 24, ratings: [5, 4, 4, 5], text: "Viel gute Laune und ein respektvoller Umgang. Absprachen wurden eingehalten." },
  { provider: "luca", member: "mitglied-08", daysAgo: 37, ratings: [5, 5, 5, 4], text: "Aufmerksamer Begleiter, angenehme Gespräche und gute Organisation." },
];

export interface DemoMessage {
  from: "member" | "provider";
  text: string;
  /** Minuten vor «jetzt». */
  minutesAgo: number;
}

export interface DemoConversation {
  provider: string;
  member: string;
  messages: DemoMessage[];
}

/** Unterhaltungen ohne Bewertung; Unterhaltungen zu Bewertungen entstehen mit den Terminen. */
export const demoConversations: DemoConversation[] = [
  {
    provider: "lina",
    member: "mitglied",
    messages: [
      { from: "member", text: "Hallo Lina, ich würde gerne nächste Woche wieder einen Termin am Abend vereinbaren. Passt dir das?", minutesAgo: 2 * 24 * 60 },
      { from: "provider", text: "Hallo Adrian, gerne. Schick mir einfach eine Terminanfrage mit deinem Wunschtermin.", minutesAgo: 2 * 24 * 60 - 45 },
      { from: "member", text: "Mache ich, danke!", minutesAgo: 2 * 24 * 60 - 60 },
    ],
  },
  {
    provider: "jade",
    member: "mitglied",
    messages: [
      { from: "member", text: "Hallo Jade, sprichst du auch Französisch? Ich bin nächsten Monat in Basel.", minutesAgo: 5 * 24 * 60 },
      { from: "provider", text: "Hallo! Oui, bien sûr. Melde dich gerne, sobald du deine Daten kennst.", minutesAgo: 5 * 24 * 60 - 120 },
    ],
  },
  {
    provider: "nora",
    member: "mitglied",
    messages: [{ from: "member", text: "Guten Tag Nora, ich habe dir eine Terminanfrage geschickt. Ich freue mich auf deine Antwort.", minutesAgo: 90 }],
  },
  {
    provider: "lina",
    member: "mitglied-03",
    messages: [
      { from: "member", text: "Hallo Lina, wie kurzfristig sind Termine bei dir möglich?", minutesAgo: 6 * 60 },
      { from: "provider", text: "Hallo Reto, in der Regel ab dem nächsten Tag. Am liebsten über die Terminanfrage.", minutesAgo: 5 * 60 },
    ],
  },
  {
    provider: "zoe",
    member: "mitglied-04",
    messages: [{ from: "member", text: "Bonjour Zoé, ich habe eine Anfrage für das Wochenende geschickt.", minutesAgo: 30 }],
  },
];

export interface DemoOpenRequest {
  provider: string;
  member: string;
  status: "REQUESTED" | "NEGOTIATING" | "CONFIRMED";
  /** Frühester Tag ab heute, an dem der Termin liegen soll. */
  inDays: number;
  durationMinutes: number;
  message: string;
}

export const demoOpenRequests: DemoOpenRequest[] = [
  { provider: "lina", member: "mitglied", status: "REQUESTED", inDays: 3, durationMinutes: 60, message: "Ich würde mich über einen Termin am frühen Abend freuen." },
  { provider: "lina", member: "mitglied-03", status: "NEGOTIATING", inDays: 2, durationMinutes: 120, message: "Wäre ein längerer Termin möglich?" },
  { provider: "lina", member: "mitglied-04", status: "CONFIRMED", inDays: 5, durationMinutes: 60, message: "Gerne wie besprochen." },
  { provider: "nora", member: "mitglied", status: "REQUESTED", inDays: 4, durationMinutes: 60, message: "Gerne am Nachmittag oder frühen Abend." },
  { provider: "zoe", member: "mitglied-04", status: "REQUESTED", inDays: 3, durationMinutes: 120, message: "Am liebsten am Wochenende." },
];

/** Favoriten des Logins `demo-mitglied`: Standardsammlung und eine eigene Sammlung. */
export const demoFavorites = {
  default: ["lina", "chiara", "jade", "nora", "zoe", "mila"],
  collections: [{ key: "wochenende", name: "Für das Wochenende", providers: ["elena", "ava", "clara"] }],
};

/** Profile mit Kennzahlen der letzten 30 Tage für Studio «Heute» und Statistik. */
export const demoStatsProviders = ["lina", "mara", "chiara", "jade", "nora", "zoe", "alessia"];
