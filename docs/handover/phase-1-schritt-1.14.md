# Übergabe Phase 1, Schritt 1.14 (Härtung)

**Stand:** 18.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Die vier User Journeys laufen als Browsertests durch die echte Oberfläche. Zudem gibt es eine verschlüsselte Sicherung mit getestetem Restore, eine interne Sicherheitsprüfung über die ganze Codebasis mit Korrekturen, die Datenschutz- und Sicherheitsdokumentation und Messungen der Leistung auf Staging. Dazu kommt ein fiktiver Demo-Datensatz für Staging und, bis zum Start, für die Produktion.

Entscheide und Berichte:
- `0023-demo-daten.md`
- `0024-backups.md`
- `docs/security/sicherheitspruefung-1.14.md`
- `docs/security/datenschutz-und-sicherheit.md`
- `docs/performance/messung-1.14.md`

## Abnahme

### Schritt 1.14 (v2 17)

| Kriterium | Stand |
| --- | --- |
| Playwright für Journeys A bis D | Erfüllt: `e2e/journey-a-besucher`, `-b-anbieter`, `-c-termin`, `-d-club`, je ein durchgehender Ablauf, dreimal hintereinander grün. Schritte der Phase 2 (Teamrollen, Angebote, Kampagnen, Statistik der Organisation) sind im Kopf der Spec vermerkt |
| Lasttest der Suche | Erfüllt, lokal mit 10'000 Profilen: p95 der Suche 24 ms bei einem, 150 ms bei 20 und 461 ms bei 50 gleichzeitigen Clients. Dabei behoben: Die Sortierung nach Relevanz rechnete mit `numeric` (106 → 17 ms) |
| Restore-Test | Erfüllt: automatischer Test mit echtem `pg_dump` und `age` in Wegwerf-Datenbanken, dazu eine Probe auf dem echten Schema. Ein Restore auf Railway folgt mit den Schlüsseln der Betreiberin |
| Sicherheitsprüfung | Intern erfüllt: kein Befund «hoch», vier «mittel» behoben. Der unabhängige Check folgt vor dem Start (vereinbart) |
| Leistungsziele aus 14.6 auf Staging gemessen und dokumentiert | Gemessen, nachgemessen und dokumentiert (`docs/performance/messung-1.14.md`):<br>• **Suche erfüllt:** 80 ms p95 auf dem Server, `Server-Timing` 24 ms.<br>• **LCP Desktop erfüllt:** 0,65 bis 0,78 s.<br>• **CLS:** auf der Profilseite behoben (0,979 → 0), die Ladezustände von Entdecken und Club sind ebenso angepasst.<br>• **LCP mobil im Labor nicht erfüllt:** 3,5 bis 4,0 s, weil das LCP-Bild im gestreamten Teil steckt; nächste Schritte im Bericht.<br>• **INP** ist im Labor nicht messbar |

### 20.7 aus v1.0

| Kriterium | Stand |
| --- | --- |
| Erfolgreicher unabhängiger Sicherheitscheck | **Offen**, externer Penetrationstest vor dem öffentlichen Start, vereinbart am 18.11.2026 (Umfang im Prüfbericht, Abschnitt 7) |
| Wiederherstellung aus Backup getestet | Lokal erfüllt; auf Railway, sobald die Schlüssel gesetzt sind (Probe auf Staging nach Entscheid 0024) |
| Sensible Daten vor unbeabsichtigtem Zugriff geschützt | Erfüllt: Jeder der 56 Server Actions und 12 Route Handler nimmt das Konto aus der Sitzung, jede Kernfunktion prüft das Recht. Dazu Passkeys mit PIN, Origin-Prüfung im Echtzeit-Dienst, sichere Cookies und COOP |
| Missbrauchsmeldungen vollständig funktionsfähig | Erfüllt (1.13), dazu Schutz vor falschen kritischen Meldungen (PRD v2 12.4 ergänzt) |
| Notfall-Sperrungen möglich | Erfüllt: Konto sperren, Inhalt entfernen, Region zurückziehen, Feature Flags. Das Vorgehen steht in der Datenschutz- und Sicherheitsdokumentation |
| Datenschutz- und Sicherheitsdokumentation abgeschlossen | Erstellt. Offen sind die Aufbewahrungsfristen einiger Datenklassen; die klärt die Betreiberin mit der rechtlichen Beratung |

## Was gebaut ist

- **Journeys:**
  - Eigene Helfer in `e2e/support/journey.ts` und `e2e/support/register.ts`.
  - Gefunden und behoben: Der Rückweg nach der Registrierung ging verloren (v2 8.2). Im Onboarding liess sich die Verfügbarkeit nicht eintragen.
- **Backups** (`apps/cron/src/backup`):
  - Täglicher, konsistenter Dump: Mit einem eigenen Snapshot passen Manifest und Inhalt zueinander.
  - Verschlüsselt mit `age` für die öffentlichen Schlüssel der Betreiberin, in einen eigenen Bucket.
  - Aufbewahrung 14 Tage, 8 Wochen und 12 Monate.
  - Restore mit Prüfsumme, Schutz der Produktion und Abgleich der Zeilenzahlen.
  - Eigenes Image (`apps/cron/backup.Dockerfile`), weil Debian kein `pg_dump` 18 hat.
- **Sicherheit:**
  - Behoben:
    - Sofortsperre nur durch gefestigte Konten.
    - Vollständiger Datenexport.
    - Bilder werden bei der endgültigen Kontolöschung mitgelöscht.
    - Passkeys verlangen PIN oder Biometrie.
    - Gleich lange Antwortzeit bei der Registrierung, damit sie nicht verrät, ob eine E-Mail existiert.
    - Origin-Prüfung im Echtzeit-Dienst, sichere Cookies nach `APP_URL`, strengere Grenzen für Passwortprüfungen, COOP-Header.
  - Abhängigkeiten: nodemailer 10. Die Ausnahme für picomatch ist begründet; es gibt keine behobene Version.
- **Leistung:**
  - `Server-Timing` an den Such-APIs und `search.timing` im Log der Suchseite, nur mit der Dauer.
  - Die Zählungen bei leeren Ergebnissen laufen parallel.
  - Die Bilder der ersten Karten laden sofort und mit hoher Priorität.
  - Der Ladezustand der Profilseite ist mindestens so hoch wie der Bildschirm.
  - Das Werkzeug für Lasttests liegt unter `scripts/load/`; es bricht ausserhalb von localhost ab.
- **Demo-Daten** (`packages/demo`):
  - Inhalt: 24 Profile, 3 Organisationen, 10 Mitglieder, Bewertungen, Anfragen, Unterhaltungen, Statistik und 98 abstrakte Bilder über die echte Pipeline.
  - Seit dem 18.11.2026 geladen in Staging und in der Produktion.
  - In der Produktion mit doppelter Freigabe und ohne Logins.
- **Railway:**
  - Cron-Dienst `cron-lift-expired-restrictions`.
  - Die fehlenden Cron-Dienste in Staging sind ergänzt.
  - Pre-Deploy-Frist für `web` 30 Minuten.
  - `APP_URL` am Echtzeit-Dienst.
  - Eine persönliche Arbeitsumgebung «GOTit», die Staging erreicht.

## Was getestet ist (ausgeführt am 18.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | keine Datei über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 34 von 34 Aufgaben grün |
| Playwright gegen den Produktions-Build, alle Schritte 1.1 bis 1.14 | **294 von 294 grün**, ohne Wiederholung, auch nach den Korrekturen zur Leistung |
| Demo-Daten, Integrationstest getrennt | grün; auf Railway in beiden Umgebungen geladen |

## Unterwegs behoben

- **Statistik-Test:** Er schlug vor 12 Uhr fehl, weil er Ereignisse von heute in die Zukunft legte.
- **Lokale Testreste:** Der Integrationstest der Statistik markierte bei lokalen Läufen heutige Tage als aggregiert. Er räumt das jetzt auf.
- **Demo-Integrationstest:** Er lief parallel zu den Suchtests und verfälschte ihre Zahlen. Er läuft jetzt getrennt, auch in der CI.
- **Favoriten:** Ein zweites schnelles «Nach vorne» oder «Nach hinten» ging still verloren, solange der erste Schritt noch speicherte. Das war die Ursache des Testausfalls aus 1.10, der damals ungeklärt blieb. Die Schritte laufen jetzt nacheinander.
- **Moderation:** Der Test drückt die Taste N erst nach der Hydrierung.

## Was nicht geprüft ist

- **INP** ist ein Feldwert und im Labor nicht messbar. Gemessen sind TBT und einzelne Interaktionen. Das Öffnen des Filter-Sheets liegt bei 4-facher CPU-Drosselung bei 200 ms.
- **Messwege:** Die Labormessungen laufen über einen Rand von Railway in den USA. Die Zeiten beim Client enthalten deshalb etwa 134 ms Weg; die Werte vom Server stammen aus den Metriken von Railway.
- **Das Backup-Image** ist noch nie gebaut worden, weil die Paketquellen von hier gesperrt sind.

## Offene Punkte

1. **Betreiberin:**
   - Schlüsselpaar für die Backups erzeugen (Befehle in Entscheid 0024) und die öffentlichen Schlüssel geben.
   - Danach lege ich Bucket und Dienst `cron-backup-database` an und mache die Restore-Probe auf Staging.
   - Auf Railway die eingebauten Backups von Postgres einschalten.
2. **Vor dem öffentlichen Start:**
   - Externer Penetrationstest.
   - Aufbewahrungsfristen (B-05).
   - Rechtstexte ersetzen.
   - Demo-Daten aus der Produktion entfernen (Entscheid 0023).
3. **Leistung** (Messbericht, «Nächste Schritte»):
   - **LCP mobil unter 2,5 s bringen:** das LCP-Bild im ersten Teil der Antwort, weniger JavaScript beim Start.
   - Feldmessung der Web Vitals; braucht einen Entscheid zum Datenschutz.
   - Öffnen des Filter-Sheets beschleunigen.
   - Unnötiges JavaScript kürzen.
   - Die Abfrage mit Trigrammen vor etwa 50'000 Profilen umschreiben.
   - Eine zweite Instanz von `web`: Eine Instanz rendert etwa 12 Suchseiten pro Sekunde.
4. **Restrisiken aus der Sicherheitsprüfung:** offene Echtzeit-Verbindungen nach dem Abmelden, Laufzeit der Admin-Sitzungen, Grenzen nur pro Adresse, kein Virenscanner.
