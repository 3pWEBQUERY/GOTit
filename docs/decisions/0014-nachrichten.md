# 0014 Nachrichten (Schritt 1.8)

**Stand:** 17.11.2026

Grundlage: PRD v2.0 Abschnitte 7.5, 11.4, 14.1, 17 (Schritt 1.8) und PRD v1.0 FR-CHAT-001 bis 005, Abnahme 20.4.

## Wer mit wem

- **Einzelchats:** Es gibt nur Einzelchats zwischen einem Konto (Mitgliederseite) und einem Anbieterprofil. Pro Paar gibt es genau eine Unterhaltung; «Nachricht schreiben» öffnet die bestehende.
- **Wer beginnt:** nur angemeldete, altersbestätigte Konten. Das Profil muss für sie erreichbar sein und Nachrichten erlauben. Anbieter schreiben Mitglieder nie von sich aus an. Mitglieder untereinander schreiben sich nicht.
- **Weiterschreiben in einer bestehenden Unterhaltung:**
  - Die Mitgliederseite kann weiterschreiben, solange das Profil veröffentlicht oder pausiert ist.
  - Bei gesperrten, archivierten oder abgelaufenen Profilen ist eine Nachricht nicht zustellbar.
  - Schaltet der Anbieter Nachrichten ab, sind nur neue Unterhaltungen gesperrt.
- **Kein Zugang für Dritte:**
  - Verknüpfte Unternehmen und interne Rollen haben keinen Zugang zu Unterhaltungen (v1 FR-CHAT-005).
  - Die Moderation sieht nur, was gemeldet wurde, als Kopie im Fall.
  - Jede Funktion geht über die Prüfung der Teilnahme. Wer nicht beteiligt ist, bekommt dieselbe Antwort wie bei einer unbekannten ID. Das belegt ein Test: Ein anderes Mitglied, ein anderer Anbieter, ein Club-Inhaber, Admin, Moderation, Support und Besucher scheitern.

## Inhalte und Zustand

- **Text:** höchstens 4000 Zeichen.
- **Bilder:**
  - JPEG, PNG oder WebP, höchstens 10 MB, bis zu vier pro Nachricht.
  - Sie liegen privat im Bucket «originals» unter `chat/`.
  - Der Worker prüft den Typ am Inhalt, entfernt EXIF und GPS und speichert eine WebP-Fassung mit höchstens 1600 px; das Original wird gelöscht.
  - Ausgeliefert werden sie nur an Beteiligte, über signierte URLs mit 60 Sekunden Gültigkeit.
- **Andere Dateien** (PDF, Dokumente) lässt der Messenger nicht zu: Ohne Virenscanner wäre das ein unnötiges Risiko (Lücke wie in 0011). «Zulässige Dateianhänge» aus v1 FR-CHAT-001 sind damit vorerst nur Bilder.
- **Senden:** idempotent über eine Kennung, die der Browser vergibt. «Erneut senden» nach einem Fehler erzeugt keine zweite Nachricht.
- **Zustellstatus:**
  - «Wird gesendet» und «Fehlgeschlagen» zeigt der Browser.
  - «Gesendet» bedeutet gespeichert.
  - «Gelesen» erscheint nur, wenn beide Seiten Lesebestätigungen erlauben; die Voreinstellung ist aus (Entscheid 0008).
- **Online-Status:** wird im Messenger nicht angezeigt. Die Einstellung bleibt aus und wird erst mit einer Anzeige wirksam.
- **Löschen:** Eine eigene Nachricht zu löschen entfernt Text und Bilder für beide Seiten; die Zeile bleibt als «Nachricht gelöscht».
- **Archivieren und Markieren:** Beides gilt nur für die eigene Sicht. Eine neue Nachricht holt eine archivierte Unterhaltung beim Empfänger zurück.
- **Echtzeit:**
  - Der Dienst `realtime` erhält nur die ID der Unterhaltung, nie Inhalte.
  - Der Browser lädt Neues über `web` mit derselben Berechtigungsprüfung.
  - Fällt Redis aus, kommen Nachrichten trotzdem an und erscheinen beim nächsten Laden.
- **Verschlüsselung:** Die Plattform behauptet keine Ende-zu-Ende-Verschlüsselung (v1 FR-CHAT-005). Die Übertragung läuft über TLS, die Speicherung liegt bei Railway (Postgres und Buckets).

## Namen

- **Mitglieder sehen** den Anzeigenamen des Profils.
- **Anbieter sehen** den Benutzernamen des Mitglieds. Ohne Benutzernamen zeigt die Oberfläche «Mitglied» und das Beitrittsjahr, nie den Namen aus der Registrierung.

## Blockieren

- **Wirkung:** Blockieren wirkt sofort, in beide Richtungen und ohne Mitteilung an die Gegenseite.
- **Für die Blockierten:** Ihre Nachricht gilt als «nicht zustellbar», ohne Hinweis, dass blockiert wurde; ihre Ansicht enthält keine Angabe dazu.
- **Neue Unterhaltung:** Eine neue Unterhaltung ist ebenso nicht zustellbar.
- **Aufheben:** in der Unterhaltung oder unter `/einstellungen/privatsphaere` («Blockiert»).

## Melden

- **Was sich melden lässt:** eine einzelne Nachricht oder die Gegenseite. Die Gründe sind Spam, Belästigung, Betrug, falsche Identität, Minderjährige, Ausbeutung, akute Gefahr und Sonstiges.
- **Dringende Meldungen:** Die letzten drei Gründe gelten als dringend und kommen in der Moderation zuerst.
- **Kopie im Fall:** Die gemeldete Nachricht hängt als Kopie am Fall (bei der Gegenseite die letzten zehn Nachrichten). Löscht der Absender, bleibt der Fall vollständig (v2 11.4).
- **Moderation:** Meldungen landen als offener Fall in `report`. Die allgemeine Moderation mit Zuständigkeit, Entscheid und Einspruch folgt in Schritt 1.13; bis dahin zeigt `/admin/meldungen` die offenen Fälle lesend.

## Labels, Notizen, Vorlagen

- **Labels:** privat, nur für die Anbieterseite, höchstens 20, frei benennbar. Die Standard-Labels (v2 11.4) entstehen beim ersten Öffnen des Studio-Postfachs mit den übersetzten Namen: «Neue Anfrage», «Termin offen», «Bestätigt», «Rückmeldung nötig».
- **Notiz:** eine private Notiz pro Unterhaltung, nur für die Anbieterseite.
- **Vorlagen:** Die Seite `/studio/nachrichten/vorlagen` steht in der Routentabelle von v2 7.3 unter Phase 2 und kommt damit später. Bis dahin hat der Composer keine Vorlagenwahl.

## Grenzen pro Konto

| Zweck | Höchstens |
| --- | --- |
| Nachrichten | 30 pro Minute |
| Neue Unterhaltungen | 10 pro Stunde |
| Bild-Uploads | 30 pro Stunde |
| Meldungen | 10 pro Stunde |

## Aufbewahrung

- **Nie gesendete Bilder** entfernt der Cron-Dienst nach 24 Stunden.
- **Endgültig gelöschte Konten:** Ihre Bilder verlassen den Bucket, bevor die Kaskade die Zeilen löscht. Unterhaltungen, in denen nur eine Seite übrig ist, werden mit ihren Bildern entfernt.
- **Datenexport:** Er enthält die eigenen Nachrichten, die eigenen Labels und die Zahl der Blockierungen.

## Oberfläche Einstellungen, Übersicht, Admin

### «Blockiert» unter `/einstellungen/privatsphaere`

- **Liste:** Name (Profilname oder Benutzername, sonst «Mitglied») und Datum der Blockierung, die zuletzt blockierte Person zuoberst.
- **Aufheben:** «Blockierung aufheben» wirkt sofort und ohne Rückfrage, weil es umkehrbar ist. Der Toast bietet acht Sekunden lang «Rückgängig» an; das blockiert dieselbe Gegenseite wieder (v2 13).
- **Ohne Unterhaltung:** Ein Eintrag ohne gemeinsame Unterhaltung erscheint ohne Aktion, weil der Kern nur über eine Unterhaltung aufhebt.
- **Kein Rate Limit:** Die übrigen Schalter der Einstellungen haben auch keins, und das Aufheben erzeugt nichts bei Dritten.
- **Zustände:** Die Liste hat einen eigenen Lade- und Fehlerzustand; der Rest der Seite bleibt bedienbar. Leer steht ein Satz, wie jemand auf die Liste kommt.

### Ungelesene Unterhaltungen auf `/ich`

- **Umfang:** höchstens fünf, die neueste zuerst, darunter «Alle Nachrichten öffnen».
- **Eintrag:** Name der Gegenseite (Mitglied ohne Benutzernamen: «Mitglied»), «n neue Nachrichten» und die Zeit der letzten Nachricht, relativ, mit dem genauen Datum im Tooltip.
- **Ziel:** Mitgliederseite nach `/nachrichten/[id]`. Ist das Konto in der Unterhaltung Anbieter, führt der Eintrag nach `/studio/nachrichten/[id]` und sagt «im Studio».
- **Kein Inhalt:** Die Übersicht zeigt keinen Nachrichtentext.

### Zahlen in der Shell

- **Kopfzeile «Nachrichten» und Tab «Nachrichten» im Marktplatz** zählen ungelesene Unterhaltungen, in denen das Konto Mitglied ist.
- **Studio-Seitenleiste und Tab «Nachrichten» im Studio** zählen die, in denen es Anbieter ist. Die Kopfzeile bleibt auch im Studio bei der Mitgliederseite, weil sie auf `/nachrichten` führt.
- **Archiviert** zählt nicht mit.
- **Zugänglicher Name:** «Nachrichten, 3 ungelesen». Die sichtbare Zahl ist für Screenreader ausgeblendet, ab 100 steht «99+». Das Designsystem hat dafür `badgeLabel` an `IconLink`, `GlassTabBar` und `StudioSidebar`.
- **Frische:** Die Zahl wird bei jeder Anfrage neu gelesen und nie zwischen Anfragen oder Konten geteilt. Kopfzeile und Seitenleiste liegen im Layout; nach dem Lesen aktualisiert sie sich mit dem nächsten Laden oder Auffrischen der Seite.

### Meldungen im Admin (`/admin/meldungen`)

- **Wer:** Super Admin, Plattform-Administration, Moderation und Trust & Safety, jeweils mit zweitem Faktor. Support sieht den Eintrag in der Seitenleiste und auf der Seite den Hinweis, dass Meldungen private Nachrichten enthalten (wie bei den Verifizierungen). Ohne interne Rolle gibt es eine gewöhnliche 404. Die Prüfung liegt im Kern (`@app/core/moderation`) und zusätzlich in der Server Action.
- **Warteschlange:**
  - Spalten: Priorität («Dringend» als Wort mit Icon), Grund, Gemeldet (Nachricht, Mitglied, Anbieterprofil), Eingegangen am, Alter.
  - Reihenfolge: dringende zuerst, darin die älteste zuerst. «Neueste zuerst» kehrt nur die Reihenfolge innerhalb der Priorität um, dringende bleiben oben.
  - «Nächste Meldung öffnen» und die Taste N öffnen die dringendste, älteste Meldung.
  - Es gibt nur offene Meldungen, darum vorerst keinen Statusfilter.
  - Die Seitenleiste zählt offene Meldungen für Personen mit Moderationsrolle.
- **Einzelfall:**
  - Links stehen die Angaben: Grund, Text der Meldung, Gemeldet, Gemeldet von (Profil- oder Benutzername, nie der Name aus der Registrierung).
  - In der Mitte steht die Kopie der Nachrichten, verdeckt. Aufdecken verlangt einen Grund von mindestens zehn Zeichen und schreibt `report.evidence_revealed` mit diesem Grund ins Audit-Log (v2 12.4: «Das Aufdecken verlangt einen Grund»). Erst dann schickt der Server die Texte. «Wieder verdecken» nimmt sie aus der Ansicht.
  - Rechts steht der Hinweis, dass Entscheide mit Schritt 1.13 kommen.
- **Audit:**
  - Jedes Öffnen eines Falls schreibt `report.viewed` mit dem Ziel `report:<id>`, ohne Inhalt (v2 16.2).
  - Die Prüfung auf eine unbekannte ID im Layout schreibt nichts, weil sie auch beim Vorausladen läuft. Deshalb ergibt das Anzeigen der Warteschlange keinen Eintrag.

## Oberfläche

### Aufbau

- **Zwei Postfächer, getrennt nach Seite:** `/nachrichten` zeigt die Unterhaltungen, in denen das Konto Mitglied ist, `/studio/nachrichten` die als Anbieter. Das passt zu den Zahlen in der Shell. Ein Link in den falschen Bereich führt an die richtige Stelle; eine fremde oder unbekannte ID ergibt eine 404, bevor der Ladezustand erscheint.
- **Desktop (ab 768 px):**
  - Spalten: Liste (17 rem, ab 1024 px 20 rem), Verlauf und Kontext (16 rem).
  - Die Kontextspalte erscheint bei Mitgliedern ab 1024 px, im Studio ab 1280 px, weil die Seitenleiste Platz braucht. Darunter öffnet «Details» den Kontext als Seitenpanel.
  - Liste und Verlauf scrollen je für sich in einer Fläche mit der Höhe des Bildschirms; der Composer steht unter dem Verlauf.
- **Mobil (unter 768 px):**
  - `/nachrichten` ist die Liste.
  - Die Unterhaltung ist ein Vollbild: Tab-Leiste und Footer treten zurück, der Composer aus Glas ist unten fixiert, der Name steht in der mobilen Kopfzeile, «Zurück» oben links.
  - «Details» öffnet den Kontext als Sheet.
- **In der URL:**
  - Ansicht `?ansicht=ungelesen|favoriten|archiviert` (ohne Parameter «Alle»), Suche `?q=`, im Studio Label `?label=`.
  - Links auf Unterhaltungen behalten Ansicht und Filter.
  - Die Suche ist ein GET-Formular und funktioniert ohne JavaScript; Enter sucht.
- **Zeile der Liste:**
  - Name, Zeit (heute die Uhrzeit, gestern «Gestern», in der letzten Woche der Wochentag, sonst das Datum) und Vorschau («Du: …», «Bild», «Nachricht gelöscht»).
  - Ungelesen als Punkt, fette Schrift und Text für Screenreader.
  - Chips «Favorit», «Blockiert» und die eigenen Labels.
- **Leerzustände:** «Keine Treffer» mit «Suche und Filter zurücksetzen» unterscheidet sich von «Noch keine Nachrichten». Jede Ansicht hat ihren eigenen Satz.
- **Browser-Tab:** Eine Unterhaltung heisst neutral «Unterhaltung», ohne Namen der Gegenseite (v2 13, Diskretion).

### Verlauf

- **Tage:** Trenner «Heute», «Gestern» oder «Di., 10.11.2026»; alle Zeiten in Zürcher Zeit.
- **Senden:**
  - Die Nachricht erscheint sofort mit «Wird gesendet», danach «Gesendet» und, wenn der Kern es meldet, «Gelesen».
  - Scheitert sie, steht «Fehlgeschlagen» mit dem Grund und «Erneut senden» (dieselbe Kennung) da.
  - Ist sie nicht zustellbar, heisst es «Die Nachricht konnte nicht zugestellt werden.», ohne Hinweis auf eine Blockierung.
  - Eine fehlgeschlagene Nachricht ist nicht gespeichert und bleibt nur im offenen Tab stehen. «Verwerfen» gibt es in 1.8 nicht.
- **Ergänzung im Kern:** Der Verlauf liefert für eigene Nachrichten die Kennung des Browsers (`clientId`). So ersetzt die gespeicherte Nachricht die optimistische Anzeige, auch wenn die Antwort des Servers unterwegs verloren ging. Das Postfach hat dazu `memberSince` und den Filter `role`.
- **Ältere Nachrichten:** «Ältere Nachrichten laden» holt je 50; die Stelle im Verlauf bleibt stehen.
- **Pro Nachricht ein Menü:**
  - Eigene: «Nachricht löschen» mit Rückfrage, die die Folge für beide Seiten nennt.
  - Fremde: «Nachricht melden» im zweistufigen Meldedialog. Bei dringenden Gründen steht der Notruf 117 da.
- **Gelesen:** Der Browser meldet «gelesen», sobald die Unterhaltung offen und der Tab sichtbar ist.
- **Ansage:** Der Verlauf ist ein Log ohne automatische Ansage. Eine eigene, höfliche Live-Region sagt neue Nachrichten der Gegenseite an («Neue Nachricht von …»); eigene und nachgeladene ältere Nachrichten werden nicht vorgelesen. Dafür hat `MessageThread` die Option `announce`.
- **Umkehrbares ohne Rückfrage:** Archivieren und Blockieren wirken sofort und bieten acht Sekunden «Rückgängig» im Toast (v2 13). Der Stern ist ein Schalter.
- **Blockiert:** Statt des Composers steht «Du hast diesen Kontakt blockiert.» mit «Blockierung aufheben».

### Bilder

- **Anhängen:** «Bild anhängen» mit Mehrfachauswahl. Typ, Grösse und Zahl prüft schon der Browser.
- **Fortschritt:** Hochladen in Prozent, dann «Wird vorbereitet», bis der Worker fertig ist (der Browser fragt alle 1,5 Sekunden nach). Fehler stehen mit Grund am Bild, jedes Bild lässt sich entfernen.
- **Senden:** Laufen noch Uploads oder gibt es fehlerhafte Bilder, sagt ein Satz am Composer, was fehlt; der Button bleibt bedienbar. Bilder ohne Text sind erlaubt (Composer-Option `allowEmpty`).
- **Anzeige:**
  - Über `/api/nachrichten/bilder/[id]`: eine Weiterleitung auf die signierte URL mit 60 Sekunden Gültigkeit, ohne Cache.
  - Die grosse Ansicht ist die Lightbox des Profils.
  - Alternativtext «Bild von {Name}» oder «Von dir gesendetes Bild».
- **Nach dem Neuladen:** Nicht gesendete Bilder stehen wieder im Composer.

### Kontext

- **Mitgliederseite:** Name, «Profil ansehen», «Kontakt blockieren» oder «Blockierung aufheben», «Profil melden».
- **Studio:**
  - Name und «Mitglied seit {Jahr}»; die Zeile entfällt, wenn der Name schon so lautet.
  - Labels mit Häkchen: Sie speichern sofort, mit Bestätigung am Ort.
  - Private Notiz mit «Notiz speichern».
  - Blockieren und «Mitglied melden».
- **Labels verwalten:**
  - Ein Seitenpanel neben dem Label-Filter der Liste: anlegen, umbenennen, löschen.
  - Löschen fragt am Ort nach, nicht in einem zweiten Dialog.
  - Melden aus dem Sheet schliesst zuerst das Sheet (keine Dialoge in Dialogen, v2 13).

### Echtzeit

- **Verbindung:**
  - Jede offene Messenger-Seite verbindet sich mit einem Token aus `POST /api/realtime/token`.
  - Nach einem Abbruch wartet sie 1 bis 30 Sekunden (verdoppelt, mit Streuung) und holt jedes Mal ein neues Token.
- **Neues laden:**
  - Ein Ereignis lädt Liste und Verlauf über `router.refresh()`, gebündelt höchstens alle 400 ms.
  - Nach dem Verbinden und beim Zurückkehren in den Tab lädt die Seite einmal nach.
- **Ohne Echtzeit:**
  - Ist `REALTIME_URL` nicht gesetzt oder der Dienst nicht erreichbar, lädt eine offene Messenger-Seite alle 20 Sekunden nach, solange der Tab sichtbar ist.
  - Ohne Netz erscheint ein Banner; ungesendete Nachrichten bleiben stehen.
- **Konfiguration:**
  - `REALTIME_URL` liest der Server und gibt sie der Seite mit (keine öffentliche Build-Variable).
  - Die CSP erlaubt ihre Herkunft in `connect-src`.
  - Der Dienst lauscht wie bisher auf `::`; `REALTIME_HOST` setzt eine andere Adresse für Umgebungen ohne IPv6, zum Beispiel die End-to-End-Tests.

### Profil

- **«Nachricht schreiben»** steht im Kontaktbereich, wenn das Profil Nachrichten erlaubt und weder pausiert noch eingeschränkt ist.
  - Besucher führt es zur Anmeldung mit `?weiter=` zurück zum Profil.
  - Angemeldete öffnet es die bestehende oder eine neue Unterhaltung. Ein Problem steht am Button, bei einer Blockierung neutral.
- **Inhaber und Vorschauen** im Studio und Onboarding sehen statt des Buttons «Mitglieder können dir hier eine Nachricht schreiben.»
- **«Termin anfragen»** bleibt bis 1.9 ein Satz.
- **Grenze für neue Unterhaltungen:** Sie zählt jeden Klick auf «Nachricht schreiben», auch wenn er eine bestehende Unterhaltung öffnet, weil der Kern das nicht unterscheidet.

### Nicht in 1.8

- Vorlagen, Online-Status, Terminkarten im Verlauf und Anfragen im Kontext (1.9).
- Andere Dateien als Bilder.
- Verwerfen fehlgeschlagener Nachrichten.

