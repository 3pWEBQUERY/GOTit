# 0020 Administration und allgemeine Moderation (Schritt 1.13)

**Stand:** 17.11.2026

Grundlage: PRD v2.0 Abschnitte 3, 7.8, 12.4 und 17 (Schritt 1.13), PRD v1.0 Abschnitte 9.1 bis 9.7 und Abnahme 20.6.

## Rechte der internen Rollen

Jede Funktion im Kern prüft ihr Recht selbst (`packages/core/src/admin/permissions.ts`), unabhängig von der Oberfläche. Ohne Rolle, ohne zweiten Faktor oder ohne passende Rolle wirft sie `forbidden`. Das gilt auch bei ungültiger Eingabe, damit eine Antwort nichts über Daten verrät. `SUPER_ADMIN` darf alles.

| Recht | Rollen | Grund |
| --- | --- | --- |
| Übersicht | alle internen Rollen | |
| Benutzer ansehen | Plattform-Admin, Moderation, Trust & Safety, Support | Support braucht Konten für Anfragen |
| Nachrichten oder Termine einschränken | Plattform-Admin, Moderation, Trust & Safety | |
| Konto sperren | Plattform-Admin, Trust & Safety | Schwerer Eingriff: Anmeldung gesperrt, Profil nicht öffentlich |
| Interne Rollen vergeben | nur Super-Admin | Kritische Änderung (20.6) |
| Fälle der Moderation | Plattform-Admin, Moderation, Trust & Safety | Wie bisher, Support nicht (Entscheid 0014) |
| Kritische Fälle entscheiden | Trust & Safety | Eskalationsweg nach v2 12.4 |
| Regionen, Kategorien, Feature Flags, Dienststatus | Plattform-Admin | |
| Inhalte und SEO | Plattform-Admin, Redaktion | |
| Support | Plattform-Admin, Support | |
| Audit-Log | Plattform-Admin, Trust & Safety | |

## Fälle

- **Fall-ID:** fortlaufende Nummer, angezeigt als «M-Jahr-Nummer».
- **Priorität** aus dem Grund:
  - Kritisch: Minderjährigkeit, Ausbeutung, akute Gefahr.
  - Hoch: Betrug, Identitätstäuschung, Belästigung.
  - Normal: anderes.
  - Niedrig: Spam.
- **Reihenfolge:** Die Warteschlange sortiert nach Priorität, darin die älteste zuerst.
- **Regeln:** R-MOD-1 bis R-MOD-8, dazu R-MOD-0 für «Kein Verstoss». Jeder Entscheid braucht Regel und Begründung; beide stehen im Audit-Log, der gemeldete Inhalt nie.
- **Entscheide je Ziel:**

  | Entscheid | Ziele |
  | --- | --- |
  | Kein Verstoss | alle |
  | Zur Korrektur | Medien |
  | Entfernen | Nachricht, Bewertung, Medium, Profil, Organisation |
  | Konto einschränken (Nachrichten oder Termine, mit oder ohne Ende) | alles mit Konto dahinter |
  | Konto sperren (mit oder ohne Ende) | alles mit Konto dahinter |

- **Gleichzeitige Entscheide** ergeben einen Gewinner; der zweite erfährt «schon entschieden».
- **Einspruch,** einmal pro Fall:
  - Das betroffene Konto kann gegen eine Massnahme Einspruch erheben, die meldende Person gegen «Kein Verstoss».
  - Über den Einspruch entscheidet nie die Person, die den Fall entschieden hat (Vier-Augen-Prinzip); nur Super-Admin darf das.
  - Wird einem Einspruch gegen eine Massnahme stattgegeben, kommt der Inhalt wieder und die Einschränkungen des Falls werden aufgehoben. Gegen «Kein Verstoss» öffnet er den Fall erneut.

## Sofortsperre bei kritischen Gründen (v2 12.4)

- **Bei Meldungen aus einem Konto:** Bei Minderjährigkeit, Ausbeutung oder akuter Gefahr wird der gemeldete Inhalt beim Eingang gesperrt und der Fall an Trust & Safety eskaliert. Beides steht im Audit-Log.
  - Nachrichten werden für beide Seiten ausgeblendet.
  - Bewertungen werden entfernt.
  - Medien werden gesperrt.
  - Profile und Organisationen werden aus der Öffentlichkeit genommen.
- **Aufheben:** «Kein Verstoss» stellt den vorherigen Zustand wieder her.
- **Meldungen ohne Konto** (`/melden`) bekommen dieselbe Priorität und Eskalation, sperren aber nichts automatisch. Sonst liesse sich jedes Profil anonym und ohne Grenze aus der Öffentlichkeit nehmen. Offen: siehe unten.
- **Grenzen:** Meldungen aus Konten sind auf 10 pro Stunde begrenzt, Meldungen ohne Konto auf 5 pro Stunde und Adresse.

## Einschränkungen und Sperren (v1 9.2)

- **Arten:**
  - Nachrichten: keine Nachrichten, keine neuen Unterhaltungen.
  - Termine: keine Anfragen, kein Annehmen und kein Gegenvorschlag. Absagen bleibt aus Sicherheitsgründen möglich.
  - Sperre: Sie schliesst beides ein.
- **Bei einer Sperre:**
  - Alle Sitzungen enden, auch die im Zwischenspeicher von Better Auth.
  - Die Anmeldung wird abgelehnt.
  - Das Anbieterprofil ist nicht öffentlich; sein vorheriger Status wird gemerkt und beim Aufheben wiederhergestellt.
- **Ende:** Befristete Einschränkungen gelten ab ihrem Ende nicht mehr. Der Cron-Dienst `cron-lift-expired-restrictions` hebt sie stündlich formal auf und gibt gesperrte Profile frei.
- **Schutz:** Niemand schränkt sich selbst ein. Konten mit interner Rolle schränkt nur Super-Admin ein.
- **Einspruch:**
  - Bei Einschränkungen in den Einstellungen.
  - Bei Sperren, weil die Anmeldung nicht geht, über `/kontakt` mit der Kategorie «Einspruch gegen eine Sperre».
  - Auch hier gilt das Vier-Augen-Prinzip.

## Offen

1. **Sofortsperre durch Meldungen aus Konten:** Ein Konto kann mit einer falschen kritischen Meldung ein Profil sofort aus der Öffentlichkeit nehmen, bis Trust & Safety entscheidet. Vorschlag:
   - Erst sperren, wenn das meldende Konto älter als 7 Tage ist und seine Adresse bestätigt hat.
   - Wiederholte falsche kritische Meldungen schränken das meldende Konto ein.
   - Trust & Safety muss kritische Fälle innerhalb einer festen Frist entscheiden, zum Beispiel 4 Stunden.

   **Entschieden am 18.11.2026:** Die Betreiberin behält die umgesetzte Regel; die PRD v2 12.4 ist ergänzt. **Umgesetzt in Schritt 1.14** (Sicherheitsprüfung, B-01): der erste Punkt, dazu höchstens 3 Sofortsperren pro meldendem Konto in 24 Stunden (`packages/core/src/moderation/intake.ts`). Frist für Trust & Safety und Einschränkung bei wiederholten Falschmeldungen sind nicht umgesetzt.
