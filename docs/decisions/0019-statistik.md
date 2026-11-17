# 0019 Statistik und Studio «Heute» (Schritt 1.12)

**Stand:** 17.11.2026

Grundlage: PRD v2.0 Abschnitte 11.1, 11.6, 14.5 und 17 (Schritt 1.12) sowie PRD v1.0 Abschnitte 7.2 und 7.3.

## Was gezählt wird

| Ereignis | Wann | Wo im Code |
| --- | --- | --- |
| Einblendung in der Suche | Je gezeigtem Profil auf einer Ergebnisseite, mit dem Filterschlüssel der Suche (nie Freitext) | Web, Suchseiten |
| Profilaufruf | Einmal pro Besucher, Profil und Tag; nie die eigenen Aufrufe | Web, Profilseite |
| Kontaktaktion | Eine neue Unterhaltung entsteht | Kern, `startConversation` |
| Terminanfrage | Eine Anfrage wird gestellt | Kern, `createBookingRequest` |
| Bestätigter Termin | Eine Anfrage wird angenommen | Kern, `actOnBookingRequest` |
| Favorit dazu oder weg | Das Herz, also die Standardsammlung | Kern, `setFavorite` |
| Medienaufruf | Einmal pro Besucher, Medium und Tag, beim Öffnen in der Lightbox | Web, Profilgalerie |

Werbekampagnen-Performance (v1 7.2) kommt mit der Werbung in Phase 2.

## Datenschutz (v1 7.3)

- **Rohereignisse** enthalten nur Profil, Art, Zeit, bei Medien die Medien-ID und bei Einblendungen den Filterschlüssel. Nie Besucher-ID, IP-Adresse, Konto oder Freitext.
- **Einmal pro Besucher und Tag:** Ein Hash aus einer Kennung des Besuchers, dem Ziel, dem Tag und dem Geheimnis der Plattform. Er liegt nur in Redis und verfällt nach 24 Stunden. Fällt Redis aus, wird eher einmal zu viel gezählt, als die Seite zu blockieren.
- **Anzeige:** Gezeigt werden nur Summen, nie einzelne Besucher (v2 11.6).

## Aggregation

- **Tageszahlen:** Kalendertage in Zürcher Zeit. Der Cron-Dienst `cron-aggregate-stats` aggregiert nachts jeden abgeschlossenen Tag in `stat_daily`, je Profil und Art sowie je Medium und Suchschlüssel.
- **Wiederholbar:** Ein zweiter Lauf schreibt dieselben Zahlen. Kürzlich aggregierte Tage werden neu gerechnet, solange ihre Rohereignisse noch da sind.
- **Abfragen:** Für aggregierte Tage zählen die Tageszahlen, für alle anderen die Rohereignisse. So stimmt der laufende Tag, und nichts zählt doppelt.
- **Löschen:** Rohereignisse aggregierter Tage werden nach 3 Tagen gelöscht (Datensparsamkeit).
- **Abnahme 1.12:** Ein Integrationstest legt einen Datensatz über mehrere Tage an, aggregiert und vergleicht Kennzahlen, Trichter, Tageswerte, Medien und Suchen mit den erwarteten Summen. Dazu kommen die Grenze um Mitternacht, ein zweites Profil, die Wiederholung und das Löschen.

## Oberfläche

- **Heute `/studio` (v2 11.1):**
  - Oben «Zu erledigen» und die Spalte «Heute», ab 1024 px nebeneinander, darunter untereinander. Der Profilstatus mit «Pausieren» bleibt, wo er auf jeder Studio-Seite steht.
  - «Zu erledigen» in fester Reihenfolge: Sperre und Verifizierung, offene Terminanfragen (die zuerst ablaufende oben, bis zu drei einzeln verlinkt), ungelesene Nachrichten, Korrekturen (Profil, abgelehnte Änderung, Fotos). Zuletzt, was nur zur Kenntnis ist (Prüfung läuft). Leer steht «Nichts offen».
  - «Heute» zeigt die Einträge des eigenen Kalenders in der Zone des Anbieters, auf den Tag gekürzt (00:00 bis 24:00), ohne Namen der Mitglieder. Termine und Anfragen führen zur Anfrage.
  - Kennzahlen für 7 oder 30 Tage, `?zeitraum=30` in der URL, als Links (gehen ohne JavaScript). «Zur Statistik» übernimmt den Zeitraum.
  - «Dein Profil» rechnet mit `completeness()` aus dem Kern, wie der Suchindex, und nennt den ersten fehlenden Teil in der Reihenfolge Kurzbeschreibung, Beschreibung (ab 200 Zeichen voll), Sprachen, Angebot, Preise, drei öffentliche Fotos. Der Link führt zum Abschnitt im Studio oder zu den Medien.
- **Statistik `/studio/statistik` (v2 11.6):**
  - Zeitraum `?zeitraum=7|30|90` oder `?von=…&bis=…`; Standard 7 Tage. Ein eigener Zeitraum endet spätestens heute und hat höchstens 366 Tage. Ist er ungültig, zeigt die Seite 7 Tage und nennt den Grund am Ort.
  - Kennzahlen, Trichter, Linie und Tabellen beziehen sich auf denselben Zeitraum; darüber steht er samt Vorperiode.
- **Vergleich in Zahl und Wort:** Mit Vorwert über null in ganzen Prozent («25 % mehr als in den 7 Tagen davor»), sonst als Differenz («4 mehr …»). Favoriten sind ein Saldo und immer eine Differenz mit Vorzeichen. Rundet die Änderung auf 0 %, heisst es «Gleich viele wie …»; das Icon folgt dem Wort, Farben tragen keine Bedeutung.
- **Quoten im Trichter:** Anteil an der Stufe darüber. Ist die Stufe darüber 0, steht «–» statt einer Division durch null. Eine Quote über 100 % ist möglich (zum Beispiel Profilaufrufe über einen geteilten Link ohne Einblendung) und bleibt stehen.
- **Leerzustände:** Eine Grafik ist leer, wenn im Zeitraum keine einzige Zahl über null liegt; dann steht «Noch keine Daten für diesen Zeitraum» statt leerer Achsen. Jede Grafik hat die Tabellenansicht derselben Daten und eine Fussnote, wie gezählt wird.
- **Suchen in Worten:** Die Filterschlüssel werden mit denselben Wörtern wie gespeicherte Suchen beschrieben (`loadDescribeContext`). Eine Suche ohne Filter speichert den Schlüssel `-`, weil ein leerer Schlüssel in den Tageszahlen «keine Dimension» heisst; sie erscheint als «Ohne Filter».
- **Erfassen in der Web-App:**
  - Die Oberfläche kennt Profile nur über den Slug; der Kern ordnet Slugs den IDs zu (`recordSearchImpressionsForSlugs`, `recordProfileViewForSlug`, `recordMediaViewForSlug`). Keine ID erreicht den Browser.
  - Einblendungen: die Treffer der zuletzt geladenen Seite (bei «Weitere laden» nicht die früheren noch einmal), Schlüssel `impressionSearchKey`, also die Filter ohne Freitext, Sortierung, Ansicht und Seite.
  - Gezählt wird mit `after()` nach der Antwort und nie bei Prefetch. Auch nicht vor der Altersprüfung: Das Layout leitet dann um, die Seite rendert aber parallel mit.
  - Besucherkennung: Konto-ID für Angemeldete, sonst ein Hash aus `x-real-ip` und Browserkennung. Nie gespeichert; der Kern hasht sie noch einmal (siehe oben).
  - Profilaufrufe nur in den Zuständen «online» und «pausiert», nie vom Inhaber.
  - Medienaufrufe über eine Server-Aktion beim Zeigen in der Lightbox, begrenzt wie die Vorschläge der Suche. Nur für ein freigegebenes, für den Besucher nicht gesperrtes Medium eines erreichbaren Profils. In Vorschauen (Studio, Onboarding) zählt die Galerie nicht.
- **Organisationen:** «Heute» der Organisation bleibt bei seinen Aufgaben; ihre Statistik kommt in Phase 2 (v2 7.7).
