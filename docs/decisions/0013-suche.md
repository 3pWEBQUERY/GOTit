# 0013 Suche, Landingpages, Favoriten, gespeicherte Suchen (Schritt 1.7)

**Stand:** 17.11.2026

Grundlage: PRD v2.0 Abschnitte 7.1, 7.5, 9.1 bis 9.3, 14.4, 17 (Schritt 1.7) und PRD v1.0 FR-SEARCH-001 bis 006, 5.6, Abnahme 20.3.

## Index und Sichtbarkeit

- **Index:** Die Tabelle `search_profile` ist die einzige Quelle der Suche (PRD v2 14.4). Sie enthält nur öffentlich sichtbare Profile und nur öffentliche, freigegebene Daten:
  - freigegebene Regionen samt Kanton jeder Stadt,
  - freigegebene Kategorien,
  - sichtbare Preise,
  - öffentlich freigegebene Bilder.
- **Aktualisierung:**
  - Jede Änderung an Profil, Status, Medien, Prüfentscheid, Identität oder Konto reiht einen Job in die Queue `search-index` ein. Der Worker baut dann die Zeile neu oder entfernt sie.
  - Der Cron-Dienst `rebuild-search-index` baut den Index jede Nacht vollständig neu auf.
  - Scheitert das Einreihen, bricht die Aktion des Anbieters nicht ab; der Fehler wird geloggt.
- **Doppelte Sicherung:** Jede Abfrage prüft zusätzlich zur Abfragezeit drei Bedingungen:
  - den Profilstatus `PUBLISHED`,
  - das Ablaufdatum der Identitätsprüfung,
  - «nur für Mitglieder» nur für angemeldete Konten.

  Ein verspäteter Job kann ein Profil deshalb höchstens zu spät zeigen, nie zu lange. Pausierte, gesperrte, eingeschränkte und archivierte Profile erscheinen in keinem Suchpfad (Abnahme 1.7). Das gilt für die Suche, Entdecken, die Landingpages und die Vorschläge.
- **Eingeschränkte Profile** (`RESTRICTED`) sind über die Profilseite erreichbar, erscheinen aber nicht in der Suche. Eine Einschränkung durch die Moderation soll die Reichweite nicht belohnen.
- **Volltext:** generierte Spalte `search_vector` mit der Konfiguration `simple`. Sie umfasst Name, Kurzbeschreibung sowie Regionen und Kategorien in allen vier Sprachen. Freitext wird als Präfix gesucht («zür» findet «Zürich»). Tippfehler im Namen fängt die Wortähnlichkeit aus `pg_trgm` ab.
- **Messung:** Die Leistung der Suche (Ziel unter 500 ms am 95. Perzentil) wird mit dem Lasttest in Schritt 1.14 gemessen. Erst danach fällt der Entscheid über Meilisearch.

## Filter

| Gruppe aus FR-SEARCH-002 | Jetzt | Später |
| --- | --- | --- |
| Standort | Kanton oder Stadt; Umkreis 10, 25 oder 50 km um den Mittelpunkt der gewählten Region | Land: nur die Schweiz (v2 16.3) |
| Profil | Sprachen | Profiltyp mit den Clubs (1.11); Altersbereich, sobald das Profil ein freiwilliges Altersfeld hat (heute keins). Verifizierungsstatus: Jedes suchbare Profil ist identitätsgeprüft, ein Filter wäre wirkungslos. Das Signal steht auf jeder Karte |
| Angebot | Kategorien, Preisrahmen (günstigster sichtbarer Preis) | Verfügbarkeit mit dem Kalender (1.9), Touren |
| Inhalte | Mit geprüften Fotos, neue Profile (30 Tage); «kürzlich aktualisiert» als Sortierung | Mit verifizierten Bewertungen (1.10), Videos (Phase 3) |

- **Verknüpfung:** Innerhalb einer Gruppe gilt «oder» (Deutsch oder Englisch), zwischen Gruppen «und».
- **Unbekannte oder nicht freigegebene Werte:** Eine unbekannte Region oder Kategorie ergibt null Treffer statt aller. Andere ungültige Parameter fallen still weg, damit eine alte URL nie in einen Fehler läuft.
- **Profile ohne Preise** erscheinen nicht, sobald ein Preisfilter aktiv ist.

## Ranking

- **«Relevanz»** setzt sich zusammen aus:
  - Textrelevanz,
  - Übereinstimmung mit der gewählten Region,
  - Vollständigkeit (0 bis 100),
  - Aktualität (halbiert sich alle 30 Tage).

  Verifizierung, Tarif und Bewertungen fliessen nicht ein (v1 FR-SEARCH-004, v2 11.7). Die Verfügbarkeit kommt mit dem Kalender dazu.
- **Gleichstand** löst die Profil-ID auf. «Weitere laden» zeigt deshalb nie Dubletten.
- **Sortierungen:** Relevanz, Kürzlich aktualisiert, Neu, Preis (aufsteigend, ohne Preis zuletzt). Keine Sortierung nach Beliebtheit.
- **Bezahlte Platzierungen** gibt es erst mit der Werbung (Phase 2). Die Karte kann das Wort «Anzeige» bereits tragen, und die Trefferzahl zählt Anzeigen nicht mit.

## URL

- **Schlüssel:** Sie sind in allen Sprachen gleich, damit eine geteilte Suche nach einem Sprachwechsel dieselbe bleibt:
  - `q`, `ort`, `umkreis`, `sprache`, `kategorie`,
  - `preis_min`, `preis_max`, `fotos`, `neu`,
  - `sortierung`, `ansicht`, `seite`.
- **Was die URL enthält:** nie private Daten, nur Slugs, Sprachcodes, Grenzen und Schalter.
- **«Weitere laden»:** Ein Link auf `seite=n+1` lädt die Seiten 1 bis n+1 auf dem Server, höchstens 20 Seiten zu 24 Profilen. Neuladen und Zurück stellen genau diesen Stand wieder her (Abnahme 1.7). Der Footer bleibt erreichbar.
- **Landingpages** (`/ch/[kanton]`, `/ch/[kanton]/[stadt]`, `/kategorie/[slug]`):
  - Sie sind Suchen mit fester Voreinstellung.
  - Zusätzliche Filter bleiben auf der Landingpage. Wer die Voreinstellung ändert, landet auf `/suche` mit allen Parametern.
  - Eine Stadt verlangt den passenden Kanton, sonst gibt es eine echte 404.
  - `/profile` ist die Suche über alle Einzelanbieter; heute sind das alle Profile, bis Clubs mit 1.11 dazukommen.

## Region auf Entdecken

- Die Region stammt aus dem Cookie `region` (letzte Wahl, funktional, 1 Jahr). Ohne Cookie gilt die erste hervorgehobene Region.
- «In meiner Nähe» fragt den Standort des Geräts nur nach ausdrücklichem Tippen ab. Der Server bestimmt daraus die nächste freigegebene Region und speichert nur deren Slug; die Koordinaten werden nicht gespeichert.

## Favoriten und Sammlungen

- Jedes Konto hat genau eine Standardsammlung «Favoriten»; das Herz auf Karten und Profil gilt ihr. Dazu kommen bis zu 20 eigene Sammlungen mit je bis zu 200 Einträgen. Neue Einträge stehen oben, «Nach oben» und «Nach unten» sortieren.
- **Was sich merken lässt:** nur Profile, die die Person gerade sehen darf.
  - Wird ein gemerktes Profil gesperrt oder läuft die Identität ab, bleibt der Eintrag als «Nicht mehr verfügbar» stehen, ohne Name, Bild und Link, und lässt sich entfernen.
  - Pausierte Profile bleiben mit Hinweis erreichbar (v2 10.1).
- **Sichtbarkeit:** Sammlungen sind nie öffentlich (v1 5.6); eine fremde Sammlungs-ID verhält sich wie eine unbekannte.
- Benachrichtigungen bei Änderungen kommen mit dem Benachrichtigungsmodul.

## Gespeicherte Suchen

- **Was gespeichert wird:** nur die Filter, ohne Sortierung, Ansicht und Seite, höchstens 50 pro Konto.
- **Doppelte und leere Suchen:** Dieselbe Filterkombination ergibt keinen zweiten Eintrag; der Button zeigt dann «Gespeichert». Eine Suche ohne Filter lässt sich nicht speichern.
- Benachrichtigungen über neue Treffer kommen mit dem Benachrichtigungsmodul.
- Der Suchverlauf ist laut v1 FR-SEARCH-005 optional. Er wird nicht gebaut: Ein Verlauf auf einer solchen Plattform ist sensibel, und gespeicherte Suchen decken den Bedarf ausdrücklich und unter Kontrolle der Person ab.

## Rate Limits

Pro Client-Adresse:

| Zweck | Höchstens |
| --- | --- |
| Suchseiten | 120 pro Minute |
| Trefferzahl und Vorschläge | 90 pro Minute |

Pro Konto:

| Zweck | Höchstens |
| --- | --- |
| Änderungen an Favoriten und gespeicherten Suchen | 60 pro Minute |

Darüber zeigt die Seite einen Fehlerzustand mit Wartezeit, die API antwortet mit 429.
