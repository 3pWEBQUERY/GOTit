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
