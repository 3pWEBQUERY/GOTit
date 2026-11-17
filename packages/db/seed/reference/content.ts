import type { PrismaClient } from "../../src";

/**
 * Startinhalte des CMS (v2 7.8 `/admin/inhalte`), nur Deutsch. Wiederholbar:
 * Bestehende Seiten bleiben unverändert, damit Änderungen aus dem Admin nicht
 * überschrieben werden. Die Rechtsseiten sind Platzhalter, die der
 * Rechtsdienst vor dem Start ersetzt.
 */
const PLACEHOLDER =
  "**Platzhalter – vor dem Start durch den Rechtsdienst zu ersetzen.** Dieser Text ist kein gültiges Rechtsdokument.";

interface SeedPage {
  kind: "HELP" | "LEGAL";
  slug: string;
  title: string;
  summary: string;
  body: string;
}

const legal: SeedPage[] = [
  {
    kind: "LEGAL",
    slug: "agb",
    title: "Allgemeine Geschäftsbedingungen",
    summary: "Platzhalter – vor dem Start durch den Rechtsdienst zu ersetzen.",
    body: `${PLACEHOLDER}\n\nHier stehen die Bedingungen für die Nutzung der Plattform durch Mitglieder, Anbieter und Organisationen.`,
  },
  {
    kind: "LEGAL",
    slug: "datenschutz",
    title: "Datenschutzerklärung",
    summary: "Platzhalter – vor dem Start durch den Rechtsdienst zu ersetzen.",
    body: `${PLACEHOLDER}\n\nHier steht, welche Daten die Plattform bearbeitet, wozu, wie lange und welche Rechte betroffene Personen haben.`,
  },
  {
    kind: "LEGAL",
    slug: "impressum",
    title: "Impressum",
    summary: "Platzhalter – vor dem Start durch den Rechtsdienst zu ersetzen.",
    body: `${PLACEHOLDER}\n\nHier stehen Betreiberin, Adresse und Kontakt.`,
  },
  {
    kind: "LEGAL",
    slug: "richtlinien",
    title: "Richtlinien der Community",
    summary: "Platzhalter – vor dem Start durch den Rechtsdienst zu ersetzen.",
    body: `${PLACEHOLDER}\n\nHier steht, was auf der Plattform erlaubt ist und was nicht: Umgang miteinander, Profile, Medien, Bewertungen und was bei Verstössen geschieht. Die Regeln der Moderation (R-MOD-1 bis R-MOD-8) beziehen sich auf diese Seite.`,
  },
];

const help: SeedPage[] = [
  {
    kind: "HELP",
    slug: "konto-und-anmeldung",
    title: "Konto und Anmeldung",
    summary: "Registrieren, anmelden, Passwort und Konto verwalten.",
    body: [
      "## Registrieren",
      "Bei der Registrierung wählst du den Kontotyp: Mitglied, Anbieter, Club oder Agentur. Du bestätigst, dass du volljährig bist, und akzeptierst Bedingungen und Datenschutz. Das Passwort hat mindestens 12 Zeichen.",
      "Das Konto ist erst nutzbar, wenn du deine E-Mail-Adresse über den Link in der Bestätigungs-E-Mail bestätigt hast.",
      "## Anmelden",
      "Du meldest dich mit E-Mail und Passwort oder mit einem Passkey an. Ist ein zweiter Faktor eingerichtet, gibst du danach den Code aus deiner App oder einen Ersatzcode ein.",
      "## Passwort vergessen",
      "Über «Passwort vergessen» erhältst du einen Link, der 1 Stunde gilt. Ein neues Passwort beendet alle bestehenden Sitzungen.",
      "## Konto deaktivieren oder löschen",
      "In den Einstellungen kannst du deine Daten exportieren, das Konto deaktivieren oder die Löschung beantragen. Nach einem Löschantrag hast du 30 Tage Zeit; meldest du dich in dieser Frist an, ist der Antrag aufgehoben.",
    ].join("\n\n"),
  },
  {
    kind: "HELP",
    slug: "sicherheit-und-melden",
    title: "Sicherheit und Melden",
    summary: "Zweiter Faktor, Sitzungen, Blockieren und Meldungen.",
    body: [
      "## Konto schützen",
      "Unter Einstellungen › Sicherheit richtest du einen zweiten Faktor ein, fügst Passkeys hinzu, siehst deine Sitzungen und beendest sie einzeln. Das Änderungsprotokoll zeigt Anmeldungen und Änderungen an der Sicherheit.",
      "## Blockieren",
      "Blockieren wirkt sofort, in beide Richtungen und ohne Mitteilung an die Gegenseite. Aufheben kannst du es in der Unterhaltung oder unter Einstellungen › Privatsphäre.",
      "## Melden",
      "Nachrichten, Konten und Bewertungen kannst du direkt melden. Die Moderation sieht nur, was gemeldet wurde. Meldungen zu Minderjährigen, Ausbeutung oder akuter Gefahr werden zuerst bearbeitet.",
      "Bei akuter Gefahr wende dich sofort an die Polizei: Notruf 117.",
    ].join("\n\n"),
  },
  {
    kind: "HELP",
    slug: "termine",
    title: "Termine",
    summary: "Anfragen, Vorschläge, Bestätigung und Absage.",
    body: [
      "## Anfragen",
      "Termine fragst du im Profil an, in einer freien Zeit des Anbieters. Ohne eingetragene Verfügbarkeit sind keine Anfragen möglich; das Profil sagt das.",
      "## Abstimmen",
      "Beide Seiten können einen anderen Zeitpunkt vorschlagen. Annehmen kann nur, wer den aktuellen Vorschlag nicht selbst gemacht hat. Offene Anfragen laufen nach der Frist des Anbieters ab, spätestens zum vorgeschlagenen Beginn.",
      "## Absagen",
      "Beide Seiten können einen offenen oder bestätigten Termin absagen, ohne Begründung. Wer aus Sicherheitsgründen absagt, kann danach direkt melden.",
      "Jede Änderung erscheint im Verlauf des Termins.",
    ].join("\n\n"),
  },
  {
    kind: "HELP",
    slug: "nachrichten",
    title: "Nachrichten",
    summary: "Wer wem schreiben kann und was mit Nachrichten geschieht.",
    body: [
      "## Wer schreibt",
      "Unterhaltungen gibt es zwischen einem angemeldeten Mitglied und einem Anbieterprofil, das Nachrichten erlaubt. Anbieter schreiben Mitglieder nie von sich aus an.",
      "## Inhalte",
      "Eine Nachricht hat höchstens 4000 Zeichen. Du kannst bis zu vier Bilder (JPEG, PNG oder WebP) anhängen; Standortdaten werden aus Bildern entfernt. Andere Dateien sind nicht möglich.",
      "## Lesebestätigung und Online-Status",
      "Beides ist voreingestellt aus. «Gelesen» erscheint nur, wenn beide Seiten Lesebestätigungen erlauben.",
      "## Wer mitliest",
      "Niemand ausser den Beteiligten. Die Moderation sieht nur gemeldete Nachrichten.",
    ].join("\n\n"),
  },
  {
    kind: "HELP",
    slug: "fuer-anbieter",
    title: "Für Anbieter",
    summary: "Identitätsprüfung, Onboarding und Veröffentlichung des Profils.",
    body: [
      "## Identitätsprüfung",
      "Ein Profil wird erst öffentlich, wenn die Identitätsprüfung bestanden ist. Die Plattform speichert nur das Ergebnis, nie eine Kopie des Ausweises. Eine bestandene Prüfung gilt 12 Monate.",
      "## Onboarding",
      "Pflicht sind Identität, Regionen, Profil (Anzeigename, Beschreibung ab 50 Zeichen, mindestens eine Sprache) und Vorschau. Medien, Angebot und Preise sowie Verfügbarkeit sind freiwillig.",
      "## Prüfung und Veröffentlichung",
      "Nach dem Einreichen prüft die Moderation das Profil und gibt es frei oder zur Korrektur zurück, mit Begründung. Prüfpflichtige Änderungen an einem veröffentlichten Profil warten auf die Prüfung; bis dahin bleibt das bisherige Profil online.",
    ].join("\n\n"),
  },
];

export async function seedContent(db: PrismaClient): Promise<void> {
  const now = new Date();
  for (const page of [...legal, ...help]) {
    await db.contentPage.upsert({
      where: {
        kind_slug_locale: { kind: page.kind, slug: page.slug, locale: "de" },
      },
      create: { ...page, locale: "de", status: "PUBLISHED", publishedAt: now },
      update: {},
    });
  }
}
