# 0023 Demo-Daten für Staging

**Stand:** 18.11.2026

Damit sich die Plattform in Staging (und lokal) gefüllt ansehen lässt, gibt es einen fiktiven Demo-Datensatz im Paket `packages/demo` (`@app/demo`). In die Produktion kommt er nur mit einer zusätzlichen Freigabe, für die Zeit vor dem öffentlichen Start (Entscheid der Betreiberin vom 18.11.2026, siehe «Produktion»).

## Was geladen wird

| Bereich | Inhalt |
| --- | --- |
| Anbieterprofile | 24 Profile in den freigegebenen Regionen (Zürich, Genf, Basel, Bern, Lausanne und ihre Kantone; Orte wie Winterthur, Biel, Thun, Carouge, Montreux als allgemeine Ortsangabe am Kanton). 22 veröffentlicht, 2 pausiert; eines nur für Mitglieder, eines ohne Terminanfragen. Sprachen, Kurzbeschreibung, Beschreibung auf Deutsch, Preise, Kalender. |
| Sichtbarkeit | Pro Anbieterkonto eine freigegebene Identitätsprüfung (`provider = "test"`, volljährig, Lebendigkeit bestanden, ein Jahr gültig, bei jedem Lauf verlängert) und eine freigegebene Erstprüfung (`ProfileReview`, Begründung «Demo»). Damit gilt `isPubliclyVisible`. |
| Kategorien | Keine erfundenen (Entscheid 0004). Gibt es freigegebene Kategorien, bekommen die Profile ein bis drei davon. |
| Kalender | Wochenfenster (Abend, Nachmittag, Wochenende, flexibel), Puffer und Vorlauf je Profil, damit «Termin anfragen» freie Zeiten zeigt. |
| Bilder | 3 bis 5 abstrakte Bilder pro Profil (Verläufe, Formen, Körnung; nie Personen), Hochformat 4:5, 1280 × 1600, deterministisch pro Profil. Organisationen: Logo (quadratisch) und Titelbild. |
| Organisationen | Club Lumen (Zürich, Winterthur), Maison Azur (Lausanne, Genf), Agentur Nordlicht (Basel). Veröffentlicht, Geschäftsidentität freigegeben (UID mit ungültiger Prüfziffer, damit sie nie einem echten Unternehmen gehört), Standorte mit Öffnungszeiten, je vier aktive Verknüpfungen. |
| Mitglieder | 10 Konten. 16 Termine im Status COMPLETED mit veröffentlichten Bewertungen (einige mit Stellungnahme), 5 offene oder bestätigte Anfragen in der Zukunft, Unterhaltungen mit Nachrichten, Favoriten und eine eigene Sammlung für `demo-mitglied`. |
| Statistik | Ereignisse der letzten 30 Tage bis «jetzt» für 7 Profile (Einblendungen mit Suchschlüssel, Aufrufe, Kontakte, Anfragen, Favoriten, Medienaufrufe). |
| Hilfe und Rechtstexte | Nicht im Demo-Paket; sie kommen wie bisher aus `packages/db/seed`. |

Nach dem Laden baut `reindexProfile` (dieselbe Funktion wie der nächtliche Neuaufbau) den Suchindex der Demo-Profile direkt auf, nicht über die Queue.

## Wie es läuft

- `pnpm --filter @app/demo seed` lädt oder aktualisiert. `--reset` entfernt zuerst alles und lädt neu, `--reset-only` entfernt nur.
- **Wiederholbar:** feste IDs (`demo_…`) und Slugs (`demo-…`), Upserts. Untergeordnete Listen (Regionen, Preise, Fenster, Öffnungszeiten, Favoriten, Statistik) werden ersetzt. Zeiten liegen relativ zu «jetzt»; ein neuer Lauf schiebt offene Anfragen wieder in die Zukunft und verlängert die Identitätsprüfungen.
- **Entfernen:** Alle Konten mit ID `demo_` (alles daran hängt per Cascade) und die Organisationen `demo_orgn_…`. Bilder werden vorher im Speicher gelöscht (Originale und Varianten).
- **Bilder durch die echte Pipeline:** Original mit `@app/storage` in «originals» (zufälliger Schlüssel wie beim Upload), Medium in PROCESSING wie nach `confirmUpload`, dann die Verarbeitung des Workers (`createProcessMediaJob` aus `@app/worker/process-media`, im selben Prozess statt über die Queue): Typprüfung, Bereinigung, 8 Varianten, IN_REVIEW, Titelbild. Danach gibt die Seed-Funktion frei (IN_REVIEW → PUBLISHED, Notiz «Demo»), ohne Prüferkonto. Fertige Bilder bleiben bei einem neuen Lauf stehen.
- **Zeitgrenze:** Ein Bild braucht etwa 3 bis 5 Sekunden; Railway bricht den Pre-Deploy-Befehl nach einer Zeitgrenze ab. Deshalb verarbeitet ein Lauf höchstens 150 Sekunden lang Bilder (`DEMO_MEDIA_BUDGET_SECONDS`), bis zu vier gleichzeitig, Titelbilder zuerst. Der Rest entsteht beim nächsten Lauf. Beim ersten Mal sind also eventuell zwei Bereitstellungen nötig, bis alle rund 100 Bilder da sind.
- **Statistik:** Rohereignisse für jeden Tag; für Tage, die die Aggregation schon abgeschlossen hat, zusätzlich `stat_daily`. `stat_aggregated_day` bleibt unberührt, damit echte Ereignisse anderer Profile weiter gezählt werden.
- Jeder Lauf und jedes Entfernen schreibt einen Eintrag ins Audit-Log (`demo.seeded`, `demo.reset`, ohne Konto).

## Prüfung der Umgebung

`run.ts` prüft vor jeder Verbindung zur Datenbank:

- `APP_ENV=production` bricht ab, ausser zusätzlich ist `DEMO_ALLOW_PRODUCTION=1` gesetzt. `NODE_ENV=production` ohne `APP_ENV` bricht immer ab.
- Erlaubt sind sonst nur `APP_ENV=staging`, `development`, `test` oder lokal ohne `APP_ENV`. Jeder andere Wert bricht ab.
- Demo-Konten bekommen nie eine interne Rolle; vorhandene werden bei jedem Lauf entfernt.

## Anmeldung

- Mit `DEMO_PASSWORD` (mindestens 12 Zeichen) bekommen alle Demo-Konten dieses Passwort. Ohne die Variable haben sie keines, vorhandene Passwörter und Sitzungen werden entfernt; niemand kann sich anmelden.
- Die Ausgabe nennt die Logins, nie das Passwort:
  - `demo-mitglied@demo.invalid`: Mitglied mit Favoriten, Unterhaltungen, Anfragen und Bewertungen.
  - `demo-anbieter@demo.invalid`: Profil «Lina» mit Anfragen, ungelesener Nachricht, Bewertungen, Statistik und Verknüpfung mit Club Lumen.
  - `demo-club@demo.invalid`: Inhaberin von Club Lumen.
- Alle Adressen liegen unter `demo.invalid` (reserviert, nie zustellbar).

## Auf Staging ein- und ausschalten

- **Einschalten:** am Dienst `web` in der Umgebung `staging` die Variable `SEED_DEMO=1` setzen, optional `DEMO_PASSWORD`. Der Pre-Deploy-Befehl `pnpm release` lädt die Demo-Daten dann nach Migrationen und Referenzdaten. Niemand muss dafür Geheimnisse anfassen.
- **Fehler:** Scheitert das Laden, scheitert der Pre-Deploy-Befehl und damit die Bereitstellung in Staging. Das ist gewollt: Ein halber Demo-Datensatz soll auffallen, nicht still bleiben. Wird `SEED_DEMO=1` in der Produktion ohne `DEMO_ALLOW_PRODUCTION=1` gesetzt, scheitert die Bereitstellung an der Prüfung oben, bevor etwas geladen wird.
- **Ausschalten:** `SEED_DEMO` entfernen. Die Daten bleiben, bis sie entfernt werden.
- **Entfernen:** `pnpm --filter @app/demo seed --reset-only` mit der Umgebung von Staging (zum Beispiel `railway run` im Dienst `web`); `--reset` entfernt und lädt neu.
- `packages/demo` ist kein Watch-Pfad von `web`: Eine Änderung nur am Demo-Paket löst keine Bereitstellung aus; dann `web` in Staging von Hand neu bereitstellen.

## Produktion

Die Betreiberin hat am 18.11.2026 entschieden, dass die Demo-Daten auch in der Produktion laufen, damit die Plattform vor dem Start gefüllt gezeigt werden kann. Dafür gilt:

- **Doppelte Freigabe:** `SEED_DEMO=1` und `DEMO_ALLOW_PRODUCTION=1` am Dienst `web` der Produktion.
- **Keine Anmeldung:** In der Produktion bekommen Demo-Konten nie ein Passwort, auch wenn `DEMO_PASSWORD` gesetzt ist. Vorhandene Passwörter und Sitzungen werden bei jedem Lauf entfernt.
- **Erkennbar:** Jede Beschreibung endet mit «Demo-Profil, fiktiv.» beziehungsweise «Demo-Organisation, fiktiv.».
- **Vor dem öffentlichen Start entfernen:** Beide Variablen löschen, dann `pnpm --filter @app/demo seed --reset-only` mit der Umgebung der Produktion. Das steht in der Checkliste für den Start.
- **Folge:** Echte Besucher könnten Demo-Profilen schreiben oder Termine anfragen. Diese erreichen niemanden; deshalb ist die Produktion mit Demo-Daten nur für die Zeit vor dem Start gedacht.

## Was sichtbar «Demo» ist

Anzeigenamen sind fiktive Vornamen und Künstlernamen, ohne Zusatz. Öffentlich steht «Demo» nur in der letzten Zeile jeder Beschreibung («Demo-Profil, fiktiv.», bei Organisationen «Demo-Organisation, fiktiv.») und in den Slugs (`/p/demo-lina`, `/c/demo-club-lumen`), die für Wiederholbarkeit und Entfernen nötig sind. Gründe: Die Oberfläche soll wie im Betrieb wirken, Karten und Suche sollen nicht von Hinweisen überladen sein, und doch ist jedes Profil beim Lesen als fiktiv erkennbar. Bewertungen, Nachrichten und Anfragen tragen keinen Hinweis; sie sind nur an Demo-Profilen und zwischen Demo-Konten.

## Tests

`packages/demo/src/demo.integration.test.ts` lädt den Datensatz zweimal in die lokale Datenbank (mit einem Bild pro Profil, damit der Lauf kurz bleibt), prüft Duplikate, Suche, öffentliches Profil, Bilder mit Varianten, Bewertungen, freie Zeiten, Organisationen, Statistik und Anmeldung und entfernt danach alles. Vorhandene lokale Demo-Daten sind nach dem Test weg. Er läuft nicht mit `pnpm test`, sondern getrennt mit `pnpm --filter @app/demo test:integration` (in der CI nach allen anderen Tests): Parallel zu den Suchtests anderer Pakete verfälschten seine Demoprofile deren Zahlen.

Die End-to-End-Tests laufen gegen die lokale Datenbank und erwarten in einigen Fällen leere Regionen (zum Beispiel «In Genf gibt es noch keine Profile» in `search-landing.spec.ts`). Vor `pnpm test:e2e` deshalb `pnpm --filter @app/demo seed --reset-only`.
