# Übergabe Phase 1, Schritt 1.12 (Studio «Heute» und Statistik)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Anbieter sehen auf «Heute», was zu erledigen ist, ihre Termine des Tages, vier Kennzahlen mit Vergleich und den Stand ihres Profils. Die Statistik zeigt Zeiträume, Trichter, Tageswerte, Suchen und Medien. Gezählt wird ohne Personenbezug; die Tageszahlen fasst ein nächtlicher Lauf zusammen. Entscheide: `docs/decisions/0019-statistik.md`.

Abnahmekriterium von 1.12 «Zahlen stimmen mit den Rohereignissen eines Testdatensatzes überein»: erfüllt.
- **Im Kern:** Ein Integrationstest legt Ereignisse über eine Woche an und aggregiert sie. Danach vergleicht er Kennzahlen, Vorperiode, Trichter, Tageswerte, Medien und Suchen mit den erwarteten Summen, auch über Mitternacht in Zürcher Zeit, bei Wiederholung und nach dem Löschen der Rohereignisse.
- **Im Browser:** Ein Test legt Ereignisse mit bekannten Zahlen an und prüft dieselben Zahlen auf «Heute» und in der Statistik.

## Was gebaut ist

- **Erfassen:** Was gezählt wird, steht als Tabelle in Entscheid 0019.
  - **Einblendungen in der Suche:** mit dem Filterschlüssel, nie mit Freitext. Dabei behoben: Der Schlüssel enthielt vorher den Freitext.
  - **Profilaufrufe:** einmal pro Besucher und Tag. Nie gezählt werden der Inhaber, das Vorausladen von Seiten und Aufrufe vor der Altersprüfung.
  - **Kontaktaktionen, Terminanfragen, bestätigte Termine, Favoriten:** im Kern, dort, wo sie entstehen.
  - **Medienaufrufe:** beim Öffnen in der Lightbox, einmal pro Besucher und Tag.
  - **Personenbezug:** Gespeichert wird nur Profil, Art und Zeit. Der Schlüssel «einmal pro Tag» liegt gehasht nur in Redis, 24 Stunden lang.
- **Aggregation:**
  - Der Cron-Dienst `cron-aggregate-stats` läuft täglich um 01:23 UTC in Production und Staging.
  - Er ist wiederholbar; Rohereignisse werden nach 3 Tagen gelöscht.
  - Abfragen mischen Tageszahlen und Rohereignisse ohne Doppelzählung.
- **«Heute» (`/studio`):**
  - «Zu erledigen» nach Dringlichkeit: Sperre und Verifizierung, ablaufende Anfragen, Nachrichten, Korrekturen. Ohne offene Punkte steht «Nichts offen».
  - Die Termine des Tages in der Zeitzone des Anbieters, ohne Namen von Mitgliedern.
  - Vier Kennzahlen für 7 oder 30 Tage mit Vergleich in Zahl und Wort, dazu eine Linie der Profilaufrufe.
  - «Dein Profil» mit Vollständigkeit und Link zum fehlenden Teil.
- **Statistik (`/studio/statistik`):**
  - Zeitraum Heute, 7, 30, 90 Tage oder eigener Zeitraum mit Vorperiode.
  - Trichter mit Quoten; Profilaufrufe pro Tag.
  - Die Tabellen «Suchen, in denen du erschienst» und «Medien nach Aufrufen».
  - Jede Grafik mit Tabellenansicht, Leerzustand und Fussnote, wie gezählt wird.

## Was getestet ist (ausgeführt am 17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | keine Datei über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 30 von 30 Aufgaben grün |
| Playwright gegen den Produktions-Build, alle Schritte 1.1 bis 1.12 | 258 von 259 im ersten Lauf; der Ausfall war ein Wettlauf zwischen parallelen Tests in der Moderation der Bewertungen (behoben, danach 20 von 20 in Wiederholung). Zweiter Gesamtlauf: **259 von 259 grün**, ohne Wiederholung |

## Was nicht geprüft ist

- **Neuladen der Suche:** Ein Neuladen zählt die Einblendungen erneut, einmal pro gezeigter Ergebnisseite.
- **Vorausladen:** Erkannt wird es an den Request-Headern; das ist nicht gegen echte Prefetches von Next.js geprüft.
- **Breiten:** nur 375 und 1280 px.
- **Langsames Laden und Fehler:** Die Hinweise sind gebaut, aber nicht durch Tests ausgelöst.

## Offene Punkte

1. **Werbekampagnen-Performance** (v1 7.2) kommt mit der Werbung in Phase 2.
2. **Statistik für Organisationen** ist Phase 2 (v2 7.7).
3. **Sicherheitshinweise auf «Heute»:** Es gibt nur Sperre und Verifizierung, keine Hinweise zu 2FA oder Sitzungen.
4. **Prozentzeichen:** Zahlen erscheinen im Format des Browsers («25%»); die Skizze der PRD zeigt «+12 %».
