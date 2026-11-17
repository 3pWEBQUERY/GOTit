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

## Oberfläche (Agent Favoriten)

- **`/favoriten`** zeigt die Standardsammlung «Favoriten», **`/favoriten/[sammlung]`** eine eigene Sammlung. Darüber stehen alle Sammlungen als Tabs mit Anzahl (v2 12.1). Die Tabs sind Links mit eigener URL und brechen auf schmalen Bildschirmen um, statt seitlich zu scrollen. Am Ende steht «Neue Sammlung».
- **Raster wie in der Suche** (v2 12.1): ProfileCard in der Rasteransicht, zwei Spalten auf dem Handy, drei ab 640 px, vier ab 1280 px; neueste vorne. Das Herz ist das einzige Element auf dem Foto und gilt «Favoriten», auch im Raster einer eigenen Sammlung.
- **Unter jeder Karte** stehen das Kästchen «Auswählen» und das Menü «Aktionen für Name»: «Nach vorne», «Nach hinten» (Wortlaut der Medienbibliothek, v2 11.3), «In Sammlung verschieben …», «Auch in Sammlungen» mit Häkchen, «Neue Sammlung …», «Entfernen». Nicht mehr verfügbare Einträge sind eine neutrale Fläche in Kartengrösse mit «Profil nicht mehr verfügbar», Kästchen und «Entfernen».
- **Mehrfachauswahl** wie in der Medienbibliothek: Eine Leiste über dem Raster sagt die Anzahl an («2 Einträge ausgewählt») und bietet «Alle auswählen», «In Sammlung verschieben», «Entfernen» und «Auswahl aufheben». Alles ist per Tastatur bedienbar.
- **Verschieben** wählt das Ziel in einem Dialog. Es geschieht atomar im Kern (`moveFavorites`): im Ziel vorne in bisheriger Reihenfolge anlegen und hier entfernen. Liegt ein Profil schon im Ziel, entfällt nur der Eintrag hier. Passt nicht alles ins Ziel (200), ändert sich nichts, und der Dialog sagt es. Ein nicht mehr verfügbarer Eintrag wandert mit und bleibt im Ziel neutral; neu gemerkt wird dabei nichts.
- **Sortieren** wirkt sofort, die neue Position wird angesagt, der Fokus bleibt am Menü des bewegten Eintrags.
- **Entfernen** (einzeln oder mehrere) fragt nicht nach und bietet im Toast 8 Sekunden «Rückgängig» (PRD 13). Die Einträge kommen an ihren alten Platz zurück, soweit die Profile noch erreichbar sind. Sind nur nicht mehr verfügbare Einträge betroffen, fehlt «Rückgängig»: Diese Profile lassen sich nicht mehr merken.
- **Pausierte Profile** tragen unter der Karte den Satz «Zurzeit pausiert …» und bleiben verlinkt.
- **Sammlung anlegen und umbenennen** geschieht in einem Dialog mit einem Feld und Speichern-Button. Leerer Name, zu langer Name, doppelter Name und das Limit von 20 stehen am Feld. Löschen fragt im Bestätigungsdialog nach und nennt die Zahl der Einträge; die Profile und «Favoriten» bleiben unberührt. «Favoriten» bietet weder Umbenennen noch Löschen an.
- **404 vor dem Ladezustand:** Die Prüfung auf eine eigene Sammlung sitzt im Layout von `[sammlung]`; der Ladezustand von «Favoriten» liegt deshalb in der Routengruppe `(standard)`. Sonst begänne die Antwort schon mit Status 200.
- **Profilseite:** Unter dem Kopf stehen der Umschalter «Favorit» (Herz, `aria-pressed`) und das Menü «Zu Sammlung hinzufügen» mit den eigenen Sammlungen, Häkchen, «Neue Sammlung …» und «Alle Sammlungen ansehen». Besucher führt das Herz zu `/anmelden?weiter=<Profil>`, das Menü sehen sie nicht. Der Inhaber sieht beides nicht, die Vorschau im Studio und im Onboarding ebenso wenig: `ProfileView` zeigt die Aktionen nur, wenn die Seite sie übergibt.
- **`/suchen`:** Jede Suche zeigt ihren Namen, die Filter in Worten («Zürich, Umkreis 25 km · spricht Deutsch oder Englisch · ab CHF 100 · mit geprüften Fotos») und das Speicherdatum. Dazu kommen «Öffnen» (Link auf `/suche` mit genau diesen Parametern), «Umbenennen» (Dialog) und «Löschen» mit Rückfrage. Eine Region oder Kategorie, die nicht mehr freigegeben ist, steht als «nicht mehr verfügbar» da, statt still zu fehlen. Der Leerzustand erklärt «Suche speichern» und führt zur Suche.

## Oberfläche (Agent Suche)

Entscheide zur Oberfläche, die PRD v2 9.1 bis 9.3 offenlässt:

- **Eine Suchansicht** (`features/search/components/search-view.tsx`) für `/suche`, `/profile` und die Landingpages. Eine Landingpage gibt nur ihre Voreinstellung (Region oder Kategorie), Überschrift und Breadcrumbs mit. Ein `ort` oder `kategorie` in der URL einer Landingpage zählt nicht; der Pfad gilt. Wer die Voreinstellung ändert (andere Region, Region entfernt, zweite Kategorie), landet auf `/suche` mit allen Parametern, mit Verlaufseintrag; alles andere ersetzt die URL ohne Verlaufseintrag und ohne zu scrollen.
- **Breakpoint der Filter:** Die Seitenleiste erscheint ab 1024 px (bei 768 px bliebe neben 280 px Filtern zu wenig für das Raster). Darunter gibt es die haftende Leiste mit «Filter (n)» und den Chips sowie das Sheet. Die Zahl am Button zählt, was das Sheet einstellt, also ohne Freitext und ohne Voreinstellung. «Zurücksetzen» im Sheet lässt den Freitext stehen.
- **Überschrift:** Auf `/suche` ist die Trefferzahl die H1 («48 Profile in Zürich»), in einer Live-Region. Landingpages haben eine feste H1 («Profile in Zürich», «Profile im Kanton Zürich», «Massage in der Schweiz»); die Trefferzahl steht darunter als Live-Region. Kantone heissen in Auswahl, Chips und Breadcrumbs «Kanton Zürich», weil Stadt und Kanton oft gleich heissen.
- **Filterfelder:**
  - Region als eine Auswahl: «Ganze Schweiz», dann jeder freigegebene Kanton mit seinen Städten.
  - Umkreis als Auswahlknöpfe («Nur diese Region», 10, 25, 50 km), nur bei gewählter Region. Ein Regler wäre für drei feste Werte unnötig fummelig.
  - Sprachen als Kästchen: Deutsch, Französisch, Italienisch und Englisch sichtbar, die übrigen zwölf hinter «Weitere Sprachen».
  - Preis als zwei Zahlenfelder, wirksam beim Verlassen des Felds oder mit Enter.
  - Die Kategoriengruppe entfällt, solange keine Kategorie freigegeben ist.
- **Freitext mit Vorschlägen:** Die erste Option ist immer der getippte Text; Enter sucht danach. Eine Region setzt `ort`, eine Kategorie ersetzt `kategorie`, ein Profil öffnet die Profilseite. Das Feld zeigt den aktuellen Freitext. Vorschläge und Trefferzahl antworten nur nach bestätigter Altersprüfung (sonst 403), weil sie Profilnamen enthalten können.
- **Chips:** Jeder aktive Filter ist ein Chip, auch der Freitext («anna») und auf Landingpages die Voreinstellung. Mehrere Sprachen oder Kategorien stehen in einem Chip («Deutsch oder Englisch»), passend zur Verknüpfung «oder».
- **Suche speichern:** Erscheint nur mit mindestens einem Filter. Der Name entsteht aus den Chips in fester Reihenfolge («Zürich · Deutsch · Fotos geprüft», höchstens 60 Zeichen, sonst «Meine Suche»). Ein zweiter Klick auf «Suche gespeichert» entfernt die Suche wieder (Toggle, wie es `SavedSearchButton` vorsieht). Besucher sehen denselben Text als Link zur Anmeldung mit Rückweg.
- **Leerzustand:** Gibt es einen einzelnen Filter, ohne den es Treffer gäbe, nennt der Text ihn samt Trefferzahl und bietet genau diese Entfernung als Link. Sonst gibt es «Alle Filter zurücksetzen». Ohne Filter gibt es einen Link auf `/ch`.
- **Rate Limit:** `/suche`, `/profile` und die Landingpages verbrauchen das Limit «Suchseiten». Entdecken nicht: Die Seite hat feste Abfragen und ist die Startseite; ein Fehlerzustand dort wäre eine Sackgasse.
- **Fehlerzustand bei Rate Limit:** Die Seite nennt die Wartezeit in Sekunden und bietet «Neu laden»; die Filter bleiben in der URL.
- **404 vor dem Ladezustand:** Landingpages prüfen Region oder Kategorie in einem eigenen Layout, wie die Profilseite. Übersicht und Kantonsseite liegen in Routengruppen (`ch/(uebersicht)`, `ch/[kanton]/(kanton)`). Sonst würde ihr Ladezustand die Unterseiten umschliessen, und eine unbekannte Stadt antwortete mit 200.
- **Entdecken:**
  - **Reihen:** «In {Region}» (Relevanz, höchstens 10) und «Neu dabei» (Profile der letzten 30 Tage in der Region, neueste zuerst). «Alle ansehen» erscheint nur, wenn es mehr als 10 gibt.
  - **Schnellfilter:** Links «Fotos geprüft» und «Neu» auf `/suche` mit der Region. Sie sind Links, keine Schalter, weil sie die Seite wechseln.
  - **Region ändern:** Menü mit den hervorgehobenen Regionen, «In meiner Nähe» und «Alle Regionen» (`/ch`).
  - **Region aus dem Cookie:** Jede freigegebene Region ist gültig, auch ein Kanton oder eine nicht hervorgehobene Stadt.
  - **«In meiner Nähe»:** Gewählt wird nur eine Region, deren Mittelpunkt höchstens 150 km entfernt ist. Bei gleichem Mittelpunkt gewinnt die Stadt vor dem Kanton. Sonst sagt eine Meldung, dass in der Nähe noch keine Region freigegeben ist.
  - **Suchformular:** Das Formular von Entdecken sendet Freitext und Kategorie an `/suche`. Wer eine Region aus den Vorschlägen wählt, landet direkt auf `/suche?ort=…`.
