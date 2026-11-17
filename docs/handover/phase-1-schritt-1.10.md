# Übergabe Phase 1, Schritt 1.10 (Bewertungen)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Nach einem stattgefundenen Termin schreibt das Mitglied eine Bewertung in vier Kategorien. Öffentlich wird sie erst nach der Moderation, ohne Namen des Autors und ohne Sternesumme. Der Anbieter nimmt Stellung oder erhebt Einspruch; der Autor kann gegen eine Ablehnung Einspruch erheben; jede Bewertung lässt sich melden. Entscheide: `docs/decisions/0017-bewertungen.md`.

Abnahmekriterium von 1.10 «Ohne qualifizierenden Termin lässt sich keine Bewertung anlegen, auch nicht über die API»: erfüllt. Der Kern prüft den Termin; zusätzlich lehnt ein Trigger in der Datenbank jede Bewertung ohne stattgefundenen Termin des Autors ab. Ein Test fügt eine Bewertung per SQL am Code vorbei ein und scheitert damit.

## Was gebaut ist

### Kern

- **Berechtigung:**
  - Nur das Mitglied eines Termins mit dem Status «Stattgefunden».
  - Pro Termin eine Bewertung, bis 30 Tage danach.
  - Vier Kategorien von 1 bis 5 und Freitext von 20 bis 2000 Zeichen.
- **Moderation:**
  - Freigeben, Ablehnen und Entfernen, jeweils mit Regel R-REV-1 bis 5, Begründung und Audit-Eintrag.
  - Gleichzeitige Entscheide ergeben einen Gewinner.
  - Support hat keinen Zugang.
- **Stellungnahme, Einspruch, Meldung:**
  - Stellungnahme des Anbieters zu veröffentlichten Bewertungen.
  - Einspruch: der Anbieter gegen eine veröffentlichte, der Autor gegen eine abgelehnte oder entfernte Bewertung.
  - Melden mit Kopie des Texts in `/admin/meldungen`.
- **Suche:** Zahl der veröffentlichten Bewertungen im Suchindex, Filter «Mit Bewertungen».

### Oberfläche

- **Mitglied:**
  - `/bewertungen` mit wartenden Terminen und eigenen Bewertungen samt Status und Einspruch.
  - `/bewertungen/neu/[termin]` mit Hinweis, was nicht in den Text gehört.
  - «Bewertung schreiben» in der Liste `/termine` und auf `/termine/[id]` nach «Stattgefunden» (v2 12.1).
- **Profil:**
  - Tab «Bewertungen» mit Zahl und eigener URL; Abschnitt auf der Übersicht.
  - Jede Bewertung mit Datum, «Nach bestätigtem Termin», den vier Kategorien, Text und der Stellungnahme direkt darunter.
  - «Bewertung melden» in zwei Schritten.
- **Studio:** `/studio/bewertungen` mit Stellungnahme schreiben, ändern, entfernen und Einspruch.
- **Admin:**
  - `/admin/bewertungen` mit Warteschlange und Einsprüchen.
  - Fall mit Entscheid; nur die Entscheide, die aus dem aktuellen Status möglich sind.
  - Einspruch abweisen.
  - Seitenleiste mit Zahl der offenen Fälle.

## Was getestet ist (ausgeführt am 17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | keine Datei über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 30 von 30 Aufgaben grün |
| Playwright gegen den Produktions-Build, alle Schritte 1.1 bis 1.10 | **232 von 233 grün** ohne Wiederholung; der eine Ausfall siehe unten |

Die Tests decken ab:
- Kein «Bewertung schreiben» vor «Stattgefunden»; jeder andere Status abgelehnt.
- Eine zweite Bewertung desselben Termins abgelehnt; fremde Termine ergeben 404.
- Erst nach Freigabe auf dem Profil, ohne Autor.
- Stellungnahme direkt darunter.
- Einspruch des Anbieters entfernt die Bewertung, Einspruch des Autors bringt sie zurück.
- Meldung legt einen Fall an.
- Support ohne Entscheid.
- axe ohne Befunde; kein horizontales Scrollen bei 375 px.

## Beobachtet

- **Ein Favoriten-Test** («Standardsammlung: … in eine andere Sammlung legen») wartete im Gesamtlauf mit drei parallelen Workern einmal vergeblich auf die Antwort einer Server Action. Allein lief er viermal hintereinander grün (24 von 24 mit der ganzen Datei).
- **Vermutete Ursache:** Unter Last klickt der Test, bevor React den gestreamten Teil der Seite hydriert hat; der Klick löst dann nichts aus. Für Nutzer ist das ein seltener verlorener Klick auf einer langsamen Verbindung, kein Datenfehler.
- **Weiteres Vorgehen:** Bleibt der Ausfall, kommt ein gezielter Fix: Die Tests warten auf die Hydrierung des betroffenen Bereichs.

## Was nicht geprüft ist

- **Fehlerzustände:** Die Fehler bei Rate Limit und abgelaufener Frist sind gebaut, aber nicht durch Tests ausgelöst.
- **320 px:** Geprüft ist nur 375 px.

## Offene Punkte

1. **Begründung der Moderation:** Sie bleibt intern. Ob Autor und Anbieter eine Kurzform sehen sollen, ist offen (Benachrichtigungen, Schritt 1.13).
2. **Wiederholte Einsprüche:** Nach einem abgewiesenen Einspruch ist ein neuer möglich. Eine Grenze dafür kommt mit der allgemeinen Moderation in Schritt 1.13.
3. **Automatische Erkennung von Manipulation** (v1 FR-REVIEW-005, P1) kommt mit Schritt 1.13.
