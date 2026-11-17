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

## Oberfläche Mitglied und Thread

Was PRD v2 10.2, 11.4, 11.5 und 12.1 offen lassen, für `/p/[name]/anfrage`, `/termine`, `/termine/[id]`, die Karte im Verlauf und `/ich`:

- **Panel oder Sheet:** ab 768 px Seitenpanel, darunter Sheet in voller Höhe. Beides erscheint erst, wenn der Browser die Breite kennt; das Profil darunter ist server-gerendert. Schliessen führt per `replace` zum Profil zurück; mit Eingaben fragt das Panel am Ort nach («Anfrage verwerfen?»), nicht in einem zweiten Dialog.
- **Satz unter dem Titel:** «Unverbindlich. {Name} entscheidet frei, ob es zu einem Termin kommt.» Kein Geschlecht, keine Zusage im Namen des Anbieters.
- **Auswahl:**
  - Tag: nur Tage der nächsten 14 Tage mit mindestens 30 freien Minuten.
  - Uhrzeit: im Raster von 30 Minuten innerhalb der freien Zeiten.
  - Dauer: nur Stufen, die ab der gewählten Uhrzeit vollständig frei sind. Ändert sich die Uhrzeit, bleibt die Dauer, wenn sie passt, sonst 60 Minuten oder die längste passende.
  - Region: freiwillig, mit «Keine Angabe»; nur die freigegebenen Regionen des Profils.
  - Alles in der Zone des Anbieters.
- **Besucher:** Das Formular ist ohne Konto bedienbar. «Anfrage senden» führt zu `/anmelden?weiter=/p/[name]/anfrage?tag=…&zeit=…&dauer=…&region=…`. Die Nachricht steht nie in der URL, sondern im Sitzungsspeicher des Tabs (`booking-request:<slug>`); ohne Speicher geht nur sie verloren. Nach dem Senden wird sie gelöscht. Ist die Zeit aus dem Entwurf inzwischen vergeben, sagt das Formular das, statt still zu leeren.
- **Nach dem Senden:** «Anfrage gesendet» im Panel mit «Anfrage ansehen» (`/termine/[id]`) und «Unterhaltung öffnen». Die URL bleibt `/anfrage`; ein Neuladen zeigt wieder das Formular, eine zweite offene Anfrage lehnt der Kern ab («duplicate», mit Hinweis auf «Termine»).
- **Ohne freie Zeiten:** «Noch keine freien Zeiten eingetragen» mit «Nachricht schreiben», wenn das Profil Nachrichten annimmt. Nimmt es keine Terminanfragen an (abgeschaltet, pausiert, eingeschränkt), erscheint «Termin anfragen» auf dem Profil nicht; wer die URL trotzdem öffnet, sieht «Zurzeit keine Terminanfragen». Der Inhaber sieht den Knopf nie; `/anfrage` führt ihn zum Profil.
- **Fehler:** Zeitfragen des Kerns («unavailable», «too-soon», «too-far») stehen an der Uhrzeit und laden die freien Zeiten neu, eine nicht mehr freigegebene Region an der Region, alles andere oben im Formular. Eine Blockierung wird nie genannt («Eine Anfrage an dieses Profil ist zurzeit nicht möglich»).
- **Zeitzone:** Angezeigt wird in der Zone des Anbieters. Geht die Uhr des Browsers zum gezeigten Zeitpunkt anders (nicht nur: andere IANA-Zone), steht der Name der Zone in der Sprache der Seite dabei, zum Beispiel «(Mitteleuropäische Zeit)». Server und erstes Rendern zeigen ihn nie; so weichen sie nicht ab. Auf `/ich` steht die Zeit ohne Zonennamen, die Anfrage selbst nennt ihn.
- **`/termine`:** Tabs Offen («Angefragt» und «In Abstimmung»), Bestätigt (noch nicht vorbei), Vergangen, als `?ansicht=` in der URL. Zeilen: Anbieter, Zeitraum, Status als Wort, bei offenen der Ablauf.
- **`/termine/[id]`:** Status, aktueller Vorschlag mit Hinweis, wer ihn gemacht hat, Region, eigene Nachricht, Aktionen, Links zur Unterhaltung und zum Profil, Verlauf (neuestes zuerst). Fremde und unbekannte IDs ergeben im Layout eine 404; ist das Konto Anbieter, führt die Seite zu `/studio/anfragen/[id]`.
- **Aktionen** (für Seite und Karte dieselben, der Kern entscheidet, welche erscheinen):
  - Annehmen und «Als stattgefunden bestätigen» geschehen sofort mit Toast.
  - Ablehnen, Absagen und «Als strittig melden» fragen nach, benennen die Folge («endgültig», was die Gegenseite sieht) und bieten einen freiwilligen Grund; er ist für die Gegenseite sichtbar, das sagt das Feld.
  - «Aus Sicherheitsgründen absagen» fragt ohne Grundfeld nach. Die Gegenseite sieht nur «Abgesagt», im Verlauf ohne Grund; nur wer so abgesagt hat, sieht «Aus Sicherheitsgründen abgesagt». Nach dem Schliessen öffnet sich der Meldedialog des Messengers («Kontakt melden», `reportCounterpart`), nicht als Dialog im Dialog.
  - Gegenvorschlag als Dialog: Das Mitglied wählt aus den freien Zeiten, der Anbieter gibt Tag und Uhrzeit (15-Minuten-Raster) in seiner Zone frei ein, auch ausserhalb des Kalenders. Die Umrechnung nach UTC macht der Server (`counterAtLocalTimeAction`) mit der Zone aus den Einstellungen.
  - Ein Problem steht beim Auslöser; ändert sich der Stand gleichzeitig («stale», «conflict», «not-allowed»), lädt die Ansicht neu.
- **Verlauf:** Akteur «Du», der Name der Gegenseite oder «Automatisch» (Ablauf); nie andere Namen. Neue Vorschläge nennen den Zeitraum.
- **Karte im Verlauf:** an ihrem `createdAt` zwischen den Nachrichten; liegt sie vor der ältesten geladenen Nachricht, steht sie zuoberst und rückt beim Nachladen an ihren Platz. Sie zeigt Titel («Terminanfrage an/von {Name}»), Status, Zeit, Dauer, Region, bei offenen den Vorschlag und den Ablauf, die Aktionen der betrachtenden Seite und «Anfrage ansehen» (Mitglied `/termine/[id]`, Anbieter `/studio/anfragen/[id]`). Sie aktualisiert sich mit dem Verlauf über `realtime`.
- **Bewertungen:** Nach «Stattgefunden» steht auf `/termine/[id]` ein Satz, dass Bewertungen mit einer der nächsten Versionen kommen (1.10), kein toter Knopf.
- **`/ich`:** «Offene Anfragen» und «Nächste Termine» mit höchstens fünf Einträgen, Link «Alle … ansehen» nach `/termine`.
- **Noch nicht gebaut:** «Heute verfügbar» auf Karten und im Profil (v2 9.2, 9.3) und ein eigener Hilfeartikel am Start des Ablaufs.

## Oberfläche Studio

- **Kalender `/studio/kalender`:**
  - Ansicht, Datum und Panel stehen in der URL: `ansicht=tag|woche|monat`, `datum=JJJJ-MM-TT`, `anfrage=<id>` oder `blocker=<id>`. Zurück und Teilen funktionieren.
  - Ohne `ansicht` zeigt der Kalender auf Mobile den Tag mit Wochenstreifen und ab 768 px die Woche. Beide Varianten stehen im Dokument, die unpassende ist per CSS ausgeblendet; so springt nichts beim Laden. Wer umschaltet, legt die Ansicht für alle Breiten fest.
  - Sichtbar sind die Stunden mit Einträgen, mindestens acht, sonst 8 bis 20 Uhr.
  - Abwesenheiten erscheinen schraffiert wie Blocker, mit eigenem Wort («Abwesenheit», «Abwesend»). Blocker zeigen ihre private Notiz als Titel, nur der Anbieter sieht sie.
  - Ein Klick auf eine freie Arbeitszeit öffnet «Zeit blockieren» mit diesem Zeitraum.
  - Anfragen und Blocker öffnen ein Seitenpanel über einen URL-Parameter, kein abfangendes Routing. Das Panel öffnet sofort mit Skelett, bis die Daten da sind.
  - Ohne Arbeitszeiten steht über dem Kalender ein Leerzustand mit «Arbeitszeiten eintragen».
- **Rückfragen am Ort:** Ablehnen, Absagen, «Aus Sicherheitsgründen absagen», «Strittig» und Blocker entfernen im Panel fragen in einem Bestätigungsschritt an Ort und Stelle nach (Titel als Frage, Folge, optionaler Grund, Button mit Verb und Objekt), nicht in einem Dialog, denn Seitenpanels dürfen keine Dialoge öffnen (v2 13). Der Fokus geht auf die Frage. In der Liste der Verfügbarkeit gilt der übliche Bestätigungsdialog.
- **Melden nach Sicherheitsabsage:** Auf `/studio/anfragen/[id]` öffnet «Mitglied melden» den Meldedialog des Messengers (Meldung der Gegenseite mit Kopie der letzten Nachrichten). Im Panel führt der Link auf die Seite mit `?melden=1`, die den Dialog öffnet.
- **Gegenvorschlag:** Tag, Beginn und Dauer (30 Minuten bis 12 Stunden) in der Zone des Kalenders; Vorbelegung ist der aktuelle Vorschlag. Die Umrechnung in UTC macht der Server.
- **Verfügbarkeit `/studio/kalender/verfuegbarkeit`:**
  - Vier Abschnitte: Arbeitszeiten, Regeln für Anfragen, Exklusivbelegung, Abwesenheiten und Blocker.
  - Arbeitszeiten und Regeln haben je einen Speichern-Button. Die Exklusivbelegung ist ein Schalter, der sofort speichert (v2 13: Schalter und Speichern-Button nicht im selben Formular).
  - Ein Ende um 23:59 gilt als Mitternacht; so lassen sich Fenster bis 24 Uhr eintragen.
  - Zeitzonen zur Auswahl: Zürich, Berlin, Wien, Paris, Rom, Madrid, Amsterdam, Brüssel, London, Lissabon, UTC. Eine gespeicherte andere Zone bleibt wählbar.
  - Puffer 0 bis 120 Minuten, Gültigkeit 2 Stunden bis 7 Tage, Mindestvorlauf 0 bis 72 Stunden, jeweils in festen Stufen.
  - Die Liste zeigt Einträge der nächsten 180 Tage.
- **Blocker und Abwesenheiten:** Blocker gelten stundenweise, Abwesenheiten für ganze Tage (Mitternacht bis Mitternacht in der Zone des Kalenders).
- **`/studio/anfragen`:** Tabs als Links mit `?status=offen|abstimmung|bestaetigt|vergangen`. Zeilen nennen Benutzernamen oder «Mitglied», Zeitraum, Dauer und Status; offene zeigen «Antwort bis», das Frühere aus Frist und Beginn.
- **Verlauf:** Neuestes zuerst; Akteur als Rolle («Du», «Mitglied», «System»), nie als Name. Gegenvorschläge nennen den Zeitraum, Absagen den Grund.
- **Zeitzone:** Alle Zeiten in der Zone des Kalenders. Steht das Gerät in einer anderen Zone, nennt ein Hinweis beide.
- **Texte:** eigener Namensraum `bookingStudio`, getrennt von `booking` der Mitgliederseite.
