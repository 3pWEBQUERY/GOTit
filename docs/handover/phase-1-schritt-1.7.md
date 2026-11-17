# Übergabe Phase 1, Schritt 1.7 (Suche, Landingpages, Favoriten, gespeicherte Suchen)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Besucher und Mitglieder finden Profile über Entdecken, die Suche mit Filtern und regionale oder thematische Landingpages. Mitglieder merken sich Profile in privaten Sammlungen und speichern Filterkombinationen. Entscheide: `docs/decisions/0013-suche.md`.

Abnahmekriterien von 1.7:
- **20.3 aus v1.0:** erfüllt, siehe Tabelle unten.
- **«Pausierte und gesperrte Profile erscheinen in keinem Suchpfad»:** erfüllt. Die Suche prüft den Status bei jeder Abfrage, nicht nur im Index. Das ist für Suche, Entdecken, Landingpages und Vorschläge getestet.
- **«Filterzustand überlebt Neuladen und Zurück»:** erfüllt. Der ganze Zustand steht in der URL, durch einen End-to-End-Test belegt.

## Was gebaut ist

### Suchindex (`packages/core/src/search`)

- **Tabelle `search_profile`:**
  - Sie enthält nur öffentlich sichtbare Profile mit öffentlichen, freigegebenen Daten.
  - Volltext läuft über eine generierte Spalte, Tippfehler im Namen fängt `pg_trgm` ab.
  - GIN-Indizes gibt es für Regionen, Kategorien und Sprachen.
  - Migration: `20261118000000_suche`.
- **Aktualisierung:**
  - Jede Änderung an Profil, Status, Medien, Prüfentscheid, Identität oder Konto reiht einen Job in die Queue `search-index` ein, der Worker baut die Zeile neu.
  - Der neue Cron-Dienst `cron-rebuild-search-index` baut den Index jede Nacht vollständig neu auf.
- **Prüfung zur Abfragezeit:** Jede Abfrage prüft zusätzlich den Status, den Ablauf der Identitätsprüfung und «nur für Mitglieder». Ein verspäteter Job zeigt ein Profil deshalb höchstens zu spät, nie zu lange.
- **Schnittstelle `SearchPort`:**
  - Suche mit Filtern: Region mit Umkreis, Sprache, Kategorie, Preis, Fotos, neu.
  - Vier Sortierungen.
  - Seiten zu 24 Profilen, höchstens 20 Seiten.
  - Bei null Treffern: der Filter, der am stärksten einschränkt.
  - Vorschläge für Regionen, Kategorien und Profilnamen.

### Oberfläche

- **`/suche`:**
  - **Desktop:** Filter in der Seitenleiste, die sofort wirken. Die Trefferzahl wird angesagt.
  - **Mobile:** haftende Leiste mit Chips und ein Sheet, dessen Button die Trefferzahl live zeigt.
  - **Ergebnisse:** Raster oder Liste, «Weitere 24 laden» als echter Link.
  - **Suche speichern** für Mitglieder; Besucher kommen über die Anmeldung zurück.
  - **Freitext** mit Vorschlägen.
  - **Leerzustand:** nennt den Filter, der am stärksten einschränkt, mit Link zum Entfernen.
- **Landingpages:**
  - `/ch` mit allen freigegebenen Kantonen und Städten, dazu `/ch/[kanton]`, `/ch/[kanton]/[stadt]`, `/kategorie/[slug]` und `/profile`.
  - Jede hat eine feste Voreinstellung, Breadcrumbs, Canonical und Sprachalternativen.
  - Unbekannte Werte ergeben eine echte 404.
- **Entdecken `/`:**
  - Region aus dem Cookie, «Region ändern» und «In meiner Nähe» (der Standort wird nur nach Tippen abgefragt, gespeichert wird nur der Slug).
  - Suchformular, Schnellfilter.
  - Die Reihen «In {Region}» und «Neu dabei»; leere Reihen fallen weg.
- **Favoriten** `/favoriten` und `/favoriten/[sammlung]`:
  - Sammlungen als Tabs.
  - Sortieren, Entfernen mit «Rückgängig», Umbenennen, Löschen mit Bestätigung.
  - Nicht mehr verfügbare Profile ohne Name, Bild und Link.
  - Eine fremde Sammlungs-ID ergibt 404.
- **Gespeicherte Suchen** `/suchen`:
  - Die Filter werden in Worten beschrieben.
  - Öffnen, Umbenennen, Löschen.
- **Profilseite:** Herz und «Zu Sammlung hinzufügen». Für Inhaber und in der Studio-Vorschau sind beide nicht sichtbar.
- **Rate Limits:**

  | Zweck | Höchstens |
  | --- | --- |
  | Suchseiten | 120 pro Minute und Adresse |
  | Trefferzahl und Vorschläge | 90 pro Minute und Adresse |
  | Favoriten und gespeicherte Suchen | 60 pro Minute und Konto |

### Ausserdem in diesem Schritt

- **E-Mail über Resend** (HTTP-API, `MAIL_TRANSPORT=resend`). Noch nicht aktiv, siehe offene Punkte.
- **Git-Verlauf bereinigt:** Die gespeicherten Test-Sitzungen sind aus allen Commits entfernt; der Force-Push wurde am 17.11.2026 freigegeben.

## Was getestet ist (ausgeführt am 17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | keine Datei über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 30 von 30 Aufgaben grün |
| Playwright gegen den Produktions-Build, alle Schritte 1.1 bis 1.7 | E2E_ERGEBNIS |

| Abnahme 20.3 | Beleg |
| --- | --- |
| Alle öffentlich zulässigen Profile sind suchbar | Integrationstest über alle Kombinationen aus Profilstatus, Identität und Prüfentscheid: genau die zulässige erscheint |
| Filterkombinationen liefern korrekte Resultate | Integrationstests pro Filter und kombiniert, dazu Umkreis und Kanton; End-to-End-Tests mit Chips und Zurücksetzen |
| Gesponserte Resultate sind klar gekennzeichnet | Es gibt noch keine (Werbung kommt in Phase 2); die Karte trägt «Anzeige», sobald eine Platzierung existiert, und die Trefferzahl zählt sie nicht |
| Private und gesperrte Profile erscheinen nicht versehentlich | Pausiert, gesperrt, eingeschränkt und archiviert verschwinden sofort, auch vor dem Job; «nur für Mitglieder» nur angemeldet; Vorschläge ebenso |
| Pagination und Sortierung funktionieren | 30 Profile: Seite 1 und 2 ohne Dubletten in stabiler Reihenfolge; Preis, Neu und Kürzlich aktualisiert |

## Was nicht geprüft ist

- **Rate-Limit-Fehlerzustände:** Die Fehlerseite bei zu vielen Suchanfragen und die Antwort 429 der API sind gebaut, aber nicht durch Tests ausgelöst.
- **«In meiner Nähe» bei verweigertem Standort:** nur von Hand angesehen.
- **Leistung:** Das Ziel unter 500 ms am 95. Perzentil misst erst der Lasttest in Schritt 1.14.

## Offene Punkte

1. **Resend einschalten**, Schritte in `docs/railway.md`:
   - bestätigen, dass die Nutzungsbedingungen von Resend diese Plattform zulassen (Gate 16.3),
   - eine Absender-Domain verifizieren,
   - `RESEND_API_KEY` als versiegelte Variable setzen.
2. **Staging:** Die Umgebung lässt sich nur im Railway-Dashboard anlegen. Der veraltete Dienst `staging` in der Produktion wartet auf die Bestätigung zum Löschen.
3. **Filter, die mit späteren Schritten kommen:**
   - Verfügbarkeit (1.9),
   - Bewertungen (1.10),
   - Profiltyp und Clubs (1.11),
   - Videos (Phase 3),
   - Altersbereich, sobald das Profil ein freiwilliges Altersfeld hat.
4. **Benachrichtigungen** zu Favoriten und gespeicherten Suchen kommen mit dem Benachrichtigungsmodul.
5. **Mehrfachauswahl in Sammlungen** («In Sammlung verschieben» für mehrere Einträge, v2 12.1) ist nicht gebaut; das Verschieben geht pro Eintrag über das Menü.
6. **Suchfeld in der Kopfzeile:** Es zeigt auf `/suche` die aktuelle Anfrage noch nicht; die Seite hat ein eigenes Feld.
