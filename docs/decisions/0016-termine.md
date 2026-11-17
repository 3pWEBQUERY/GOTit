# 0016 Termine (Schritt 1.9)

**Stand:** 17.11.2026

Grundlage: PRD v2.0 Abschnitte 3 (Schutzregeln), 7.3, 7.5, 10.2, 11.5, 12.1, 17 (Schritt 1.9) und PRD v1.0 FR-BOOKING-001 bis 006, Abnahme 20.5.

## Statusmodell

- **Status:** wie in v1 FR-BOOKING-003 (Angefragt, In Abstimmung, Bestätigt, Abgelehnt, Abgesagt, Abgelaufen, Stattgefunden, Strittig), umgesetzt in `packages/core/src/booking/status.ts`.
- **Annehmen:** Nur wer den aktuellen Vorschlag nicht selbst gemacht hat, kann ihn annehmen.
- **Gegenvorschlag:** beide Seiten; das Mitglied nur in freie Zeiten, der Anbieter auch ausserhalb seines Kalenders.
- **Ablehnen:** nur der Anbieter, solange die Anfrage offen ist.
- **Absagen:** für beide Seiten in jedem offenen und bestätigten Status, ohne Begründung und ohne Sperre (Abnahme 1.9, v2 Abschnitt 3). «Aus Sicherheitsgründen absagen» ist eine eigene Aktion und bietet danach das Melden an.
- **Nach dem Ende des Termins:** «Stattgefunden» oder «Strittig»; Absagen ist dann nicht mehr möglich. «Strittig» ist auch nach «Stattgefunden» noch möglich.
- **Ablauf:** Offene Anfragen laufen nach der Frist des Anbieters ab (Voreinstellung 48 Stunden), spätestens zum vorgeschlagenen Beginn. Das erledigt der Cron-Dienst `cron-booking-maintenance` jede Stunde.
- **Verlauf:** Jede Aktion ist ein Ereignis im Verlauf, mit Rolle (nie Name), altem und neuem Status, neuem Zeitraum und optionalem Grund (Abnahme 20.5 «Jede Statusänderung ist nachvollziehbar»).
- **Gleichzeitige Aktionen:** Zwei gleichzeitige Aktionen auf dieselbe Anfrage ergeben genau einen Gewinner.

## Verfügbarkeit und Doppelbuchungen

- **Verfügbarkeit:**
  - Wiederkehrende Wochenfenster in der Zeitzone des Anbieters (Voreinstellung Europe/Zurich).
  - Davon abgezogen: Abwesenheiten, Blocker und bestätigte Termine samt Puffer.
  - Zeiten werden in UTC gespeichert und in der Zone des Anbieters gezeigt; weicht die Zone des Betrachters ab, steht sie dabei (v2 11.5).
- **Anfragen:**
  - Sie müssen vollständig in eine freie Zeit passen («nur Tage mit Verfügbarkeit wählbar», v2 10.2).
  - Ohne eingetragene Fenster gibt es keine Anfragen; das Profil sagt das.
  - Mindestvorlauf: Voreinstellung 2 Stunden.
  - Höchstens 90 Tage im Voraus.
  - Dauer: 30 Minuten bis 12 Stunden in festen Stufen.
  - Eine offene Anfrage pro Unterhaltung.
- **Exklusivbelegung:** Voreinstellung an. Bestätigte Termine dürfen sich dann samt Puffer nicht überschneiden. Eine Sperre auf dem Profil verhindert, dass zwei gleichzeitige Bestätigungen dieselbe Zeit vergeben (Abnahme 20.5). Ohne Exklusivbelegung dürfen sich bestätigte Termine überschneiden.

## Schutz

- **Wer etwas sieht:**
  - Anfragen sehen nur die beiden Beteiligten.
  - Die private Notiz sieht nur der Anbieter.
  - Notizen zu Blockern und Abwesenheiten sieht nur der Anbieter.
- **Öffentlich:** Nach aussen gibt es nur freie Zeiten, nie Anfragen, Termine oder Notizen.
- **Ort:** Region ist eine allgemeine, freigegebene Region des Profils, nie eine Adresse.
- **Freiwilligkeit:** Eine Bestätigung begründet keinen Anspruch (v1 FR-BOOKING-006); das Formular sagt «Unverbindlich».

## Erinnerungen

- **Anlässe:** neue Anfrage, Bestätigung, Gegenvorschlag, Absage oder Ablehnung, bevorstehender Termin (24 Stunden vorher, einmal).
- **Kanal:** per E-Mail nach der Kanalwahl in den Einstellungen. «Terminanfragen» gilt für neue Anfragen, «Status von Terminen» für alles Weitere.
- **Inhalt:** neutral, ohne Namen, Zeiten und Einzelheiten; nur ein Link in das eigene Konto (v1 FR-BOOKING-005).
- **Echtzeit:** Thread und Postfach aktualisieren sich über `realtime` wie bei Nachrichten.

## Was später kommt

- **«Heute verfügbar»** auf Karten und der Filter «Verfügbarkeit» in der Suche (v2 9.2, 9.3) bauen auf diesen Fenstern auf. Sie kommen mit der Oberfläche von 1.9, sobald die öffentliche Abfrage freier Zeiten steht.
- **Kalender teilen** (`/kalender`, Teamtermine) ist Phase 2.
