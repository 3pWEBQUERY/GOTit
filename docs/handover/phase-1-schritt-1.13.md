# Übergabe Phase 1, Schritt 1.13 (Admin)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Die Admin-Anwendung hat jetzt alle Bereiche der Phase 1 aus v2 7.8. Dazu gehören die allgemeine Moderation mit Fällen, Entscheid, Einspruch und Sofortsperre, sowie Einschränkungen und Sperren von Konten. Öffentlich kommen Hilfe, Rechtsseiten, Kontakt und «Melden» ohne Konto dazu. Entscheide:
- `0020-administration.md`: Rechte, Fälle, Sperren
- `0021-moderation-oberflaeche.md`
- `0022-admin-bereiche.md`

Abnahme 20.6 aus v1.0:

| Kriterium | Beleg |
| --- | --- |
| Rollenrechte werden in jedem API-Endpunkt geprüft | Jede Admin-Funktion im Kern prüft ihr Recht zuerst, auch bei ungültiger Eingabe. Integrationstests rufen jede einzelne mit diesen Konten auf, und jede scheitert:<br>• Konto ohne Rolle<br>• Super-Admin ohne 2FA<br>• unbekannte ID<br>• Rolle ohne das Recht<br>Ein Test schlägt fehl, wenn eine neue Funktion in der Liste fehlt. Im Browser zeigt jede Admin-Seite ohne das Recht den Zustand «Kein Zugriff» |
| Moderationsentscheidungen werden protokolliert | Jeder Entscheid, jede Zuweisung, jeder Einspruch und jede Sperre schreibt einen Audit-Eintrag mit Regel und Begründung, nie mit dem gemeldeten Inhalt (Test prüft das). Sichtbar unter `/admin/system/audit` |
| Kritische Änderungen benötigen passende Berechtigungen | Nur wer das jeweilige Recht hat:<br>• Rollen vergeben: Super-Admin; der letzte Super-Admin bleibt<br>• Sperren: Plattform-Admin und Trust & Safety<br>• Kritische Fälle entscheiden: Trust & Safety<br>Bei Einsprüchen gilt das Vier-Augen-Prinzip |
| Ausstehende Verifizierungen sind bearbeitbar | Aus Schritt 1.5, unverändert, jetzt mit Kachel auf der Übersicht |
| Gesperrte Inhalte werden zuverlässig verborgen | Ausgeblendete Nachrichten fehlen beiden Seiten im Verlauf, im Postfach, in der Suche und bei Bildern. Entfernte Bewertungen und gesperrte Medien sind öffentlich nicht erreichbar, auch nicht per direkter Medien-URL; gesperrte Profile und Organisationen ebenso. Gesperrte Konten verlieren alle Sitzungen, auch im Zwischenspeicher, und melden sich nicht mehr an |

## Was gebaut ist

### Kern

- **Rechte:** `packages/core/src/admin/permissions.ts`, als Matrix pro Recht (Entscheid 0020).
- **Moderation** (`packages/core/src/moderation`):
  - Eingang aller Meldungen mit Priorität aus dem Grund.
  - Bei kritischen Gründen aus einem Konto: Sofortsperre und Eskalation.
  - Meldungen ohne Konto mit Zuordnung der Adresse.
  - Fälle zuweisen und «Nächster Fall».
  - Entscheide passend zum Ziel; Wiederherstellen nach «Kein Verstoss» oder stattgegebenem Einspruch.
  - Verlauf des Kontos.
- **Einschränkungen:**
  - Für Nachrichten oder Termine, oder als Sperre, mit oder ohne Ende, mit Einspruch.
  - Durchgesetzt beim Schreiben, beim Anfragen von Terminen und bei der Anmeldung.
  - Der neue Cron-Dienst `cron-lift-expired-restrictions` hebt sie stündlich auf.
- **Weitere Module:**
  - Benutzer und Rollen, Anbieterliste, Übersicht.
  - Regionen: Freigabe erst nach dokumentierter rechtlicher Prüfung (v1 9.5).
  - Kategorien; CMS und SEO.
  - Support: E-Mail zur Bestätigung ohne Inhalt, Antwort im Wortlaut.
  - Feature Flags, Audit-Log, Dienststatus.
- **Geschützte Vorschau gemeldeter Medien:** Jeder Abruf steht im Audit-Log.

### Oberfläche

- **Admin:**
  - `/admin` mit Kennzahlen aus v1 9.1.
  - `/admin/benutzer` und Detail mit Einschränken, Sperren, Aufheben und Rollen.
  - `/admin/anbieter`; `/admin/unternehmen`: der Prüfbereich aus 1.11, `/admin/organisationen` leitet um.
  - `/admin/moderation` mit Warteschlange, Filtern in der URL, Taste N und Einsprüchen gegen Sperren; Fall nach der Skizze in v2 12.4. `/admin/meldungen` leitet um.
  - `/admin/regionen`, `/admin/kategorien`, `/admin/inhalte`, `/admin/seo`, `/admin/support`.
  - `/admin/system/flags`, `rollen`, `audit`, `status`.
  - Die Seitenleiste zeigt nur Bereiche mit Recht.
- **Mitglieder und Anbieter:**
  - «Von der Moderation ausgeblendet» in Verlauf und Postfach.
  - Hinweise bei Einschränkung in Composer, Profil, Terminanfrage und Terminaktionen.
  - Einschränkungen mit Einspruch unter Einstellungen → Daten und Konto.
  - Einspruch gegen gesperrte Medien im Studio.
  - «Dieses Konto ist gesperrt.» bei der Anmeldung, mit Weg zu `/kontakt`.
- **Öffentlich:**
  - `/hilfe` und `/hilfe/[slug]`.
  - `/recht/agb`, `/recht/datenschutz`, `/recht/impressum`, `/recht/richtlinien`.
  - `/kontakt`: Kategorie «Einspruch gegen eine Sperre», Grenze pro Adresse, Honeypot.
  - `/melden` ohne Konto.
  - Markdown sicher gerendert, ohne HTML.

## Was getestet ist (ausgeführt am 17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | keine Datei über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 30 von 30 Aufgaben grün |
| Playwright gegen den Produktions-Build mit Worker und Echtzeit-Dienst, alle Schritte 1.1 bis 1.13 | **290 von 290 grün**, ohne Wiederholung |

## Was nicht geprüft ist

- **Langsames Laden und Fehlerzustände** der neuen Seiten: gebaut, aber nicht durch Tests ausgelöst.
- **Breiten:** öffentliche Seiten bei 375 px, Admin ab 1024 px; darunter nur lesend.
- **E-Mails:** Support-E-Mails sind nur bis zur Queue getestet, der Versand über Resend nicht.

## Offene Punkte

1. **Sofortsperre durch falsche kritische Meldungen** (Entscheid 0020, «Offen»): Vorschlag liegt vor, Entscheid der Betreiberin ausstehend. Bis dahin sperrt jede kritische Meldung aus einem Konto sofort, wie in der PRD.
2. **Rechtstexte:** AGB, Datenschutz, Impressum und Richtlinien sind Platzhalter und müssen vor dem Start durch den Rechtsdienst ersetzt werden.
3. **`/admin/unternehmen`** ist nur die Prüfwarteschlange, ohne Liste aller Organisationen.
4. **«Automatische Hinweise»** im Fall (v2 12.4) kommen mit einer automatischen Erkennung (v1 9.4).
5. **SEO-Overrides** wirken auf Hilfe, Recht, Kontakt und Melden. Landingpages können sie mit `withSeoOverride` übernehmen.
6. **Technische Fehler auf der Übersicht:** Es gibt keinen Fehlerspeicher; die Quelle sind die Railway-Logs.
7. **Abrechnung auf der Übersicht** kommt mit Phase 2.
