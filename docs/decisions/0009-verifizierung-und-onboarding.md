# 0009 Verifizierung und Onboarding (Schritt 1.5)

**Stand:** 17.11.2026

## Prüfdienstleister

PRD 16.1 und 16.3 verlangen die Prüfung bei einem geeigneten Dienstleister; dessen Wahl ist ein Gate für Alexander. Gebaut sind deshalb:

- **Schnittstelle** `IdentityProvider` in `packages/core/src/verification/provider.ts`. Die Plattform speichert nur Ergebnis (bestanden, volljährig, Lebendigkeit), Zeitpunkt, Ablauf und einen Grund als Schlüssel; keine Dokumentkopien.
- **Test-Dienstleister** (`IDENTITY_PROVIDER=test`): Die prüfende Person wählt das Ergebnis auf `/dev/verifizierung/<ref>`. Er ist nur verfügbar, wenn `APP_ENV` nicht `production` ist.
- **In der Produktion** gibt es keinen Dienstleister. Der Schritt «Identität» sagt das, niemand kann die Prüfung bestehen, und damit wird kein Profil öffentlich. Das ist das von PRD 16.1 verlangte Verhalten, kein Fehler.

## Regeln

- **Gültigkeit:** Eine bestandene Prüfung gilt 12 Monate (`IDENTITY_VALIDITY_DAYS`). Danach ist das Profil nicht mehr öffentlich, ohne dass jemand den Status ändern muss. Öffentliche Abfragen prüfen `isPubliclyVisible`.
- **Minderjährigkeit:** Ergibt die Prüfung eine minderjährige Person, wird das Profil sofort gesperrt, und im Audit-Log entsteht der Fall `trust-safety.minor-suspected`. Die Warteschlange für Trust & Safety folgt mit der Moderation (Schritt 1.13).
- **Öffentlich** ist ein Profil nur, wenn alles zusammenkommt: Status `PUBLISHED`, letzter Prüfentscheid `APPROVED`, Identitätsprüfung gültig. Getestet für alle 3808 Kombinationen.
- **Entscheide:** Begründung und Regelbezug sind Pflicht, jeder Entscheid landet im Audit-Log. Freigeben prüft die Identität zum Zeitpunkt des Entscheids erneut. Ein Fall lässt sich nur einmal entscheiden.
- **Prüfdetails** sind im Admin verdeckt. Aufdecken verlangt einen Grund und erzeugt einen Audit-Eintrag (PRD 12.4).

## Onboarding

- **Schritte:** Acht Schritte nach PRD 11.8.
  - Pflicht: Identität, Regionen, Profil (Anzeigename, Beschreibung ab 50 Zeichen, mindestens eine Sprache), Vorschau.
  - Freiwillig: Medien, Angebot und Preise, Verfügbarkeit.
- **Medien und Verfügbarkeit:** Ihre Editoren entstehen mit der Medien-Pipeline (1.6) und dem Kalender (1.9). Bis dahin erklären die Schritte das und lassen sich überspringen. Ein Profil ohne Medien zeigt eine neutrale Fläche, ohne Kalender keinen Verfügbarkeits-Abschnitt (PRD 10.1).
- **Kategorien** sind noch nicht gepflegt (Entscheid 0004). Das Angebot besteht deshalb vorerst aus Preisen; die Leistungen kommen dazu, sobald Kategorien freigegeben sind.

## Interne Rollen

- **Erste Rolle:** Die erste Rolle einer Umgebung vergibt die Kommandozeile: `pnpm --filter @app/db grant-role <email> SUPER_ADMIN` (auf Railway in der Shell des Dienstes `web`). Weitere Rollen vergibt die Admin-Anwendung (Schritt 1.13).
- **Zugang:** Die Admin-Anwendung verlangt eine interne Rolle und eingerichtete 2FA.
- **Profile prüfen:** Das dürfen Super Admin, Platform Admin, Trust & Safety und Moderation.
