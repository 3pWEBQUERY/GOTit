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
