# Übergabe Phase 1, Schritt 1.8 (Nachrichten)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Mitglieder schreiben Anbietern aus dem Profil heraus, beide Seiten haben ein Postfach mit Echtzeit, Bildern, Archiv, Favoriten und Suche. Anbieter organisieren mit privaten Labels und Notizen. Blockieren wirkt sofort und ohne Mitteilung; Meldungen gehen mit einer Kopie an die Moderation. Entscheide: `docs/decisions/0014-nachrichten.md`.

Abnahmekriterien von 1.8:
- **20.4 aus v1.0:** erfüllt, siehe Tabelle unten.
- **«Ein Test versucht mit jeder Rolle, fremde Chats zu lesen, und scheitert»:** erfüllt. Ein anderes Mitglied, ein anderer Anbieter, ein Club-Inhaber, Admin, Moderation, Support und Besucher versuchen es. Geprüft werden Lesen, Senden, Markieren, Archivieren, Löschen, Blockieren, Melden, Notiz und Bilder, im Kern und als 404 im Browser.

## Was gebaut ist

### Kern (`packages/core/src/messaging`, `moderation`)

- **Unterhaltungen:**
  - Einzelchats zwischen einem Konto und einem Anbieterprofil, genau eine pro Paar.
  - Wer beginnt: angemeldet, altersbestätigt, das Profil erreichbar und mit Nachrichten. Anbieter schreiben nie von sich aus an.
- **Senden:**
  - Idempotent über die Kennung des Browsers.
  - Der Status lautet «Gesendet»; «Gelesen» erscheint nur, wenn beide Seiten Lesebestätigungen erlauben.
  - Löschen entfernt den Text für beide Seiten.
- **Postfach:** Ansichten Alle, Ungelesen, Favoriten, Archiviert; Suche in den eigenen Chats; Labels als Filter.
- **Bilder:**
  - JPEG, PNG oder WebP bis 10 MB.
  - Der Worker entfernt EXIF und GPS und speichert WebP mit höchstens 1600 px.
  - Ausgeliefert nur an Beteiligte, per signierter URL mit 60 Sekunden Gültigkeit.
- **Blockieren und Melden:**
  - Blockieren wirkt in beide Richtungen und ohne Mitteilung; aufgehoben wird über die Unterhaltung oder in den Einstellungen.
  - Meldungen mit Kopie des Inhalts; dringende Gründe zuerst.
- **Moderation:** Warteschlange mit Rollenprüfung im Kern. Das Aufdecken des Inhalts verlangt einen Grund und erzeugt einen Audit-Eintrag (v2 12.4).
- **Echtzeit:**
  - Ereignisse an `realtime` tragen nur die ID der Unterhaltung, nie Inhalte.
  - Fällt Redis aus, lädt der Browser alle 20 Sekunden selbst.
- **Aufbewahrung:**
  - Nie gesendete Bilder werden nach 24 Stunden gelöscht.
  - Bei endgültig gelöschten Konten verlassen die Bilder zuerst den Bucket.
  - Verwaiste Unterhaltungen werden entfernt.
  - Der Datenexport enthält die eigenen Nachrichten.
- **Grenzen pro Konto:**

  | Zweck | Höchstens |
  | --- | --- |
  | Nachrichten | 30 pro Minute |
  | Neue Unterhaltungen | 10 pro Stunde |
  | Bilder | 30 pro Stunde |
  | Meldungen | 10 pro Stunde |

### Oberfläche

- **Postfächer:** `/nachrichten` (Mitgliederseite) und `/studio/nachrichten` (Anbieterseite) mit Liste, Verlauf und Kontext.
  - Mobil: Verlauf im Vollbild ohne Tab-Leiste, Composer aus Glas, Kontext als Sheet.
  - Studio: Standard-Labels, Labels verwalten und zuweisen, private Notiz.
- **Profilseite:** «Nachricht schreiben»; Besucher gehen über die Anmeldung zurück zum Profil.
- **Einstellungen:** «Blockiert» unter Privatsphäre, Aufheben mit «Rückgängig».
- **`/ich`:** ungelesene Unterhaltungen mit Link.
- **Zähler:** ungelesene Unterhaltungen in Kopfzeile, Tab-Leiste und Studio-Seitenleiste («Nachrichten, 3 ungelesen»).
- **Admin:** `/admin/meldungen` und `/admin/meldungen/[id]`, lesend. Die Entscheide kommen mit 1.13.

### Ausserdem in diesem Schritt

- **Domain `thegnd.net`:** eingerichtet, mit Umleitung auf den kanonischen Host (Entscheid 0015).
- **E-Mail:** Versand über Resend aktiv.
- **Staging:** eigene Umgebung mit eigener Datenbank, eigenem Redis und eigenen Buckets.

## Was getestet ist (ausgeführt am 17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | keine Datei über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 30 von 30 Aufgaben grün |
| Playwright gegen den Produktions-Build mit Worker und Echtzeit-Dienst, alle Schritte 1.1 bis 1.8 | **201 von 201 grün**, ohne Wiederholung |

| Abnahme 20.4 | Beleg |
| --- | --- |
| Nachrichten werden korrekt zugestellt | Kern: Zustellung, Ereignis an beide Seiten ohne Inhalt, idempotentes Senden. Browser: Die Nachricht erscheint ohne Neuladen beim Anbieter; «Erneut senden» nach Abbruch und nach verlorener Antwort ergibt genau eine Nachricht |
| Nicht berechtigte Personen können Chats nicht lesen | Abnahmetest mit allen Rollen (Kern) und 404 für fremde Unterhaltungen und Bilder (Browser) |
| Blockierte Kontakte können keine weiteren Nachrichten senden | Beide Richtungen «nicht zustellbar»; die Seite der Blockierten enthält keinen Hinweis; nach dem Aufheben geht es wieder |
| Nachrichtenzustände bleiben konsistent | Gelesen und ungelesen, Lesebestätigung nur bei beidseitiger Zustimmung, Löschen für beide, Archiv mit Rückkehr bei neuer Nachricht |
| Meldungen werden an die Moderation übergeben | Offener Fall mit Kopie, auch nach dem Löschen durch den Absender; Warteschlange im Admin, dringende zuerst; Aufdecken mit Grund im Audit-Log |

## Unterwegs behoben

- **Gestreamte Seiten in Tests:** React 19 blendet gestreamte Inhalte gebündelt und leicht verzögert ein; bis dahin liegt eine versteckte Kopie im Dokument. Für Nutzer unsichtbar, aber Playwright fand dadurch manchmal zwei Treffer. Die Tests warten jetzt nach jeder Navigation, bis alles eingeblendet ist (`e2e/support/settle.ts`). Die CSP ist nicht die Ursache: Alle Skripte tragen ihre Nonce.
- **Seitentitel und axe:** axe prüft erst, wenn der nachgestreamte Titel da ist.
- **Testreste:** Abgebrochene Testläufe hatten fiktive Regionen und Kategorien hinterlassen, die andere Tests beeinflussten. Die Suchtests räumen sie vorher auf.

## Was nicht geprüft ist

- **Rate Limits:** Die Fehlermeldungen bei überschrittenen Grenzen sind gebaut, aber nicht durch Tests ausgelöst.
- **Screenreader:** Die Ausgabe wurde nicht von Hand geprüft; die Tests prüfen axe und die Texte der Ansagen.
- **Echtzeit über `thegnd.net`:** Lokal ist die Echtzeit getestet. Über die öffentlichen Domains konnte ich nicht testen, weil diese Arbeitsumgebung sie nicht erreicht.

## Offene Punkte

1. **Textvorlagen** kommen mit Phase 2 (v2 7.3).
2. **Andere Dateianhänge** als Bilder brauchen zuerst einen Virenscanner (Entscheid 0011, Punkt Malware-Scanner).
3. **Online-Status:** Er wird nicht angezeigt; die Einstellung bleibt wirkungslos, bis eine Anzeige gebaut wird.
4. **E-Mail bei neuen Nachrichten:** Sie kommt mit dem Benachrichtigungsmodul; die Kanalwahl in den Einstellungen gibt es schon.
5. **Moderationsentscheide** zu Meldungen kommen mit Schritt 1.13.
6. **Nutzungsbedingungen von Resend (Gate 16.3):** Sie sind nicht schriftlich gegen diese Branche geprüft (Entscheid 0015).
