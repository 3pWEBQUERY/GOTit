# Übergabe Phase 1, Schritt 1.11 (Clubs und Agenturen)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Clubs und Agenturen pflegen im Studio ihr Unternehmensprofil, reichen Nachweise ein, verwalten Standorte mit Öffnungszeiten und laden Anbieter ein. Öffentlich werden sie erst nach geprüfter Geschäftsidentität. Anbieter nehmen Einladungen an oder lösen Verknüpfungen jederzeit; ihr Konto bleibt immer bestehen. Entscheide: `docs/decisions/0018-organisationen.md`.

Abnahmekriterium von 1.11 «Eine Organisation kann mit keiner Rolle Nachrichten oder Ausweisdaten eines Anbieters abrufen»: erfüllt. Ein Integrationstest prüft jede der fünf Rollen (Inhaber, Standortmanager, Marketing, Redaktion, Terminorganisation) gegen einen verknüpften Anbieter mit Unterhaltung, Termin und Identitätsprüfung. Keine Rolle erreicht Verlauf, Postfach, Suche in Chats, Termine, Kalender oder Ausweisdaten. Die Tabelle «Anbieter» enthält genau die öffentlichen Felder.

## Was gebaut ist

### Kern (`packages/core/src/organization`)

- **Rechte:** pro Rolle einzeln definiert; der Kern prüft sie bei jeder Aktion. Es gibt keine Berechtigung für Nachrichten, Ausweisdaten oder private Kalender.
- **Nachweise:**
  - Eingereicht werden der Firmenname laut Handelsregister, die UID (CHE-123.456.789), die Bestätigung der Berechtigung und ein Hinweis auf Bewilligungen.
  - Die Moderation entscheidet; der Entscheid steht im Audit-Log.
  - Freigeben veröffentlicht die Organisation.
  - Es werden keine Ausweiskopien gespeichert.
- **Standorte:**
  - Allgemeine Region und Ortsangabe, nie eine Adresse.
  - Öffnungszeiten pro Wochentag (0 = Sonntag), eine Nacht über Mitternacht als zwei Fenster.
  - Ausnahmen pro Tag.
- **Verknüpfungen:**
  - Einladen nur mit Berechtigung; aktiv erst mit Zustimmung des Anbieters.
  - Lösen durch beide Seiten.
  - Höchstens 20 Einladungen pro Stunde und Konto.
- **Medien:**
  - Logo, Titelbild und Galerie über dieselbe Pipeline wie bei Profilen, mit Moderation.
  - Öffentlich nur, solange die Organisation veröffentlicht ist.

### Oberfläche

- **Studio `/studio/o/[org]`:**
  - **Heute:** Aufgaben wie Nachweise, Korrekturen, offene Einladungen und fehlender Standort.
  - **Seiten:** Profil, Nachweise, Standorte mit Detail, Anbieter (Einladen per Profil-URL, Zurückziehen, Lösen), Medien, Einstellungen.
  - **Fehlende Rechte:** Die Aktion ist verborgen, ein Hinweis nennt, wer sie ausführen kann.
- **Admin:** `/admin/organisationen` und `/admin/organisationen/[id]` mit Freigeben, Korrektur oder Ablehnen.
- **Öffentlich:**
  - `/c/[slug]` mit dem Signal «Geschäftsidentität geprüft» samt Erklärung, Über uns, Standorten mit «Heute geöffnet …», verknüpften Anbietern, Galerie und Kontakt.
  - `/c/[slug]/team` und `/c/[slug]/standorte/[id]`.
  - `/clubs` mit Filter nach Art und Region; auf Entdecken die Reihe «Clubs in der Nähe».
- **Anbieter:**
  - `/studio/verknuepfungen` zum Annehmen, Ablehnen und Lösen. Der Dialog sagt «Dein Konto und dein Profil bleiben bestehen».
  - Die Seitenleiste zählt offene Einladungen.
  - Auf dem Profil steht «Verknüpft mit».

## Was getestet ist (ausgeführt am 17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | keine Datei über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 30 von 30 Aufgaben grün |
| Playwright gegen den Produktions-Build, alle Schritte 1.1 bis 1.11 | **250 von 250 grün**, ohne Wiederholung |

Die Tests decken ab:
- Die Abnahme oben, im Kern.
- Rechte pro Rolle in der Oberfläche.
- Nachweise bis zur Veröffentlichung samt Audit; Korrektur mit Grund.
- Standort mit Öffnungszeiten; ein gespeicherter «Freitag» erscheint öffentlich am Freitag.
- Einladen, Annehmen, Lösen; der Anbieter bleibt erreichbar.
- Öffentliche Seite nur mit aktiven, öffentlichen Anbietern: eingeladen oder pausiert fehlen.
- 404 für fremde, unbekannte und nicht veröffentlichte Organisationen.
- Medien einer Organisation durch den Worker.
- axe; 375 px ohne horizontales Scrollen.

## Was nicht geprüft ist

- **Langsames Laden und Fehlerzustände:** Die Hinweise bei langsamem Laden (nach 8 Sekunden) und die Fehlerzustände sind gebaut, aber nicht durch Tests ausgelöst.
- **Breite:** nur 375 px geprüft.

## Offene Punkte

1. **Medien einer Organisation** hängen am Konto der Person, die sie hochgeladen hat; wird es endgültig gelöscht, verschwinden sie mit. Sie sollten bei der Organisation bleiben; das braucht eine Änderung am Datenmodell.
2. **`/clubs`** ist eine Liste direkt aus dem Kern, keine Suche mit Voreinstellung (v2 7.1). Der Suchindex enthält nur Anbieter. Ob Organisationen in den Index kommen, ist offen.
3. **Phase 2** (v2 7.7): Team mit Rechte-Matrix, Teamkalender und Angebote. Die Rollen gibt es bereits.
4. **Benachrichtigungen** zu Einladungen und Entscheiden kommen mit dem Benachrichtigungsmodul.
