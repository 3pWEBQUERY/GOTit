# Übergabe Phase 1, Schritt 1.9 (Termine)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Anbieter tragen ihre Verfügbarkeit ein und führen Kalender und Anfragen im Studio. Mitglieder fragen aus dem Profil unverbindlich nur zu freien Zeiten an; beide Seiten verhandeln mit Gegenvorschlägen, bestätigen, sagen ab und markieren den Termin danach als stattgefunden oder strittig. Jeder Wechsel steht im Verlauf. Entscheide: `docs/decisions/0016-termine.md`.

Abnahmekriterien von 1.9:
- **20.5 aus v1.0:** erfüllt, siehe Tabelle unten.
- **«Absagen ist in jedem Status für beide Seiten möglich»:** erfüllt für jeden offenen und bestätigten Status. Der Test prüft beide Seiten, mit «Absagen» und mit «Aus Sicherheitsgründen absagen». Nach dem Ende des Termins gibt es stattdessen «Stattgefunden» und «Strittig»; Endzustände erlauben nichts mehr (Entscheid 0016).

## Was gebaut ist

### Kern (`packages/core/src/booking`)

- **Statusmodell** nach v1 FR-BOOKING-003.
  - Annehmen nur den Vorschlag der Gegenseite; Ablehnen nur der Anbieter.
  - Gegenvorschläge von beiden Seiten.
  - Atomar: Zwei gleichzeitige Aktionen ergeben einen Gewinner.
  - Jeder Wechsel ist ein Ereignis mit Rolle, Status, Zeitraum und Grund.
- **Verfügbarkeit:**
  - Wochenfenster in der Zeitzone des Anbieters, auch über die Zeitumstellung.
  - Davon abgezogen: Abwesenheiten, Blocker und Puffer.
  - Anfragen nur in freie Zeiten, mit Mindestvorlauf, höchstens 90 Tage im Voraus.
- **Doppelbuchungen:** Bei Exklusivbelegung verhindert eine Sperre auf dem Profil, dass zwei gleichzeitige Bestätigungen dieselbe Zeit vergeben.
- **Ablauf und Erinnerungen:**
  - Der Cron-Dienst `cron-booking-maintenance` lässt offene Anfragen stündlich ablaufen.
  - 24 Stunden vor einem bestätigten Termin geht einmal eine Erinnerung an beide.
  - E-Mails sind neutral, ohne Namen und Zeiten, und folgen der Kanalwahl in den Einstellungen.

### Oberfläche

- **Anfrage `/p/[name]/anfrage`:**
  - Seitenpanel oder Sheet mit eigener URL.
  - Nur freie Tage, Zeiten und Dauern sind wählbar.
  - Besucher füllen aus und melden sich erst beim Senden an; die Eingaben bleiben erhalten, die Nachricht nur im Browser.
  - Ehrliche Leerzustände ohne freie Zeiten.
- **`/termine` und `/termine/[id]`:**
  - Tabs Offen, Bestätigt, Vergangen.
  - Detail mit Verlauf und Aktionen: Annehmen, Gegenvorschlag, Absagen, «Aus Sicherheitsgründen absagen» mit anschliessendem Melden, Stattgefunden, Strittig.
- **Karte im Thread:** Jede Anfrage steht im Verlauf der Unterhaltung, mit Aktionen, auf beiden Seiten und in Echtzeit (v2 11.4).
- **`/ich`:** offene Anfragen und nächste Termine.
- **Studio:**
  - `/studio/kalender` mit Tag, Woche und Monat und der Legende der PRD, jeder Eintrag mit Status als Wort, Seitenpanel für Anfragen und Blocker.
  - `/studio/kalender/verfuegbarkeit` mit Wochenfenstern, Regeln (Zeitzone, Puffer, Gültigkeit, Vorlauf), Exklusivbelegung, Abwesenheiten und Blockern.
  - `/studio/anfragen` mit Tabs nach Status und Ablaufzeit; Detail mit Gegenvorschlag zu jeder Zeit, privater Notiz und allen Aktionen.

### Railway

- Neuer Cron-Dienst `cron-booking-maintenance` in Production und Staging, stündlich zur Minute 7.

## Was getestet ist (ausgeführt am 17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | keine Datei über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 30 von 30 Aufgaben grün |
| Playwright gegen den Produktions-Build mit Worker und Echtzeit-Dienst, alle Schritte 1.1 bis 1.9 | **218 von 218 grün**, ohne Wiederholung |

| Abnahme 20.5 | Beleg |
| --- | --- |
| Verfügbarkeiten sind korrekt | Unit-Tests für Zeitzone, Sommerzeit, Fenster, Blocker und Puffer; Anfragen ausserhalb freier Zeiten abgelehnt; im Formular nur freie Zeiten wählbar |
| Doppelbuchungen werden verhindert, sofern Exklusivbelegung eingestellt ist | Zwei gleichzeitige Bestätigungen überlappender Zeiten: genau eine gelingt. Ohne Exklusivbelegung dürfen beide. Im Studio erscheint die Meldung «Konflikt» |
| Terminanfragen können angenommen, abgelehnt und abgesagt werden | Kern und Browser, beide Seiten, alle Status |
| Jede Statusänderung ist nachvollziehbar | Verlauf mit jedem Schritt in Reihenfolge, im Kern und auf beiden Detailseiten |
| Private Terminangaben werden geschützt | Dritte sehen und ändern nichts (404); die private Notiz fehlt im HTML der Mitgliederseite; öffentlich nur freie Zeiten |

## Was nicht geprüft ist

- **Fehlerpfade:** Rate-Limit- und Netzwerkfehler sind gebaut, aber nicht durch Tests ausgelöst.
- **Gegenvorschlag des Mitglieds:** nur im Kern getestet, nicht im Browser.
- **Screenreader:** nicht von Hand geprüft. In der Wochenansicht gibt es keine Pfeiltasten-Navigation; jeder Eintrag ist aber ein Button mit Zeit und Status im Namen.
- **Studio-Seiten:** Sie aktualisieren sich nach eigenen Aktionen, nicht live, wenn das Mitglied anderswo handelt (der Thread tut es).

## Offene Punkte

1. **«Heute verfügbar»** auf Karten und der Filter «Verfügbarkeit» in der Suche (v2 9.2, 9.3).
2. **«Bewertung schreiben»** nach «Stattgefunden» kommt mit Schritt 1.10; der Kern steht bereits.
3. **Zähler auf den Tabs** der Anfragen im Studio.
4. **Einmal beobachtet:** Ein Serverfehler, als Testdaten gelöscht wurden, während eine Seite noch nachlud. Für Nutzer ist das kein Weg, aber die betroffene Abfrage sollte fehlende Daten ruhig behandeln.
