# 0021 Oberfläche der Moderation (Schritt 1.13)

**Stand:** 17.11.2026

Grundlage: PRD v2.0 Abschnitte 7.8, 12.4 und 13 sowie PRD v1.0 Abschnitte 9.2, 9.3 und 20.6. Der Kern dazu steht in `packages/core/src/moderation`; Rollen und Rechte in Entscheid 0020.

## Wege

- **`/admin/moderation`** ersetzt `/admin/meldungen` aus Schritt 1.8, **`/admin/moderation/[fall]`** den Einzelfall. Der Wert von `[fall]` ist die interne ID des Falls, nicht die Fall-ID für Menschen: So bleibt jeder Link eindeutig, auch wenn die Nummer einmal neu vergeben würde, und alte Links lassen sich eins zu eins weiterleiten.
- **Alte Adressen** leiten in `next.config.ts` dauerhaft weiter (308), mit und ohne Sprachpräfix; die Query bleibt erhalten. Wer keine interne Rolle hat, landet danach wie bisher auf einer gewöhnlichen 404.
- **Seitenleiste:** «Moderation» mit der Zahl offener Fälle samt offener Einsprüche (`countOpenReports`).

## Fall-ID

- Form **«M-JJJJ-NNNNN»**, zum Beispiel «M-2026-00412». Das Jahr ist das Jahr des Eingangs (`createdAt`) in Zürcher Zeit, die Nummer die fortlaufende `Report.number`, auf fünf Stellen aufgefüllt; ab 100 000 wird sie länger.
- Die Nummer zählt über alle Jahre weiter und ist allein schon eindeutig. Das Jahr hilft beim Lesen und Zitieren, es ist kein Teil des Schlüssels.

## Warteschlange

- Dichte Tabelle mit 40 px Zeilen: Fall-ID, Kategorie (Art des Ziels und Meldegrund), Priorität, Status mit «Einspruch offen», Zuständig, Alter. Unter 768 px wird jede Zeile zur Karte (Fall-ID, Kategorie, Priorität).
- **Priorität** als Wort mit Icon; «Kritisch» heisst in der Liste «Kritisch · Trust & Safety», damit klar ist, wer entscheidet.
- **Reihenfolge** kommt aus dem Kern: Priorität, darin der älteste Fall zuerst. «Alter» lässt sich umkehren (`?richtung=ab`); das kehrt nur die Reihenfolge innerhalb einer Priorität um, kritische Fälle bleiben oben.
- **Filter in der URL**, mit deutschen Werten: `status=aktiv|pruefung|erledigt|abgewiesen|einspruch` (Vorgabe `aktiv`, das heisst offen und in Prüfung), `prioritaet=kritisch|hoch|normal|niedrig`, `art=nachricht|mitglied|profil|medium|bewertung|organisation|adresse`, `zuweisung=mir|frei`. Unbekannte Werte fallen still auf die Vorgabe zurück. Jede Änderung eines Filters steht sofort in der URL.
- **Leer:** ohne Filter «Keine aktiven Fälle», mit Filtern «Keine Fälle für diese Filter» mit «Filter zurücksetzen». **Laden:** Skelett der Tabelle nach 150 ms, nach 8 Sekunden ein Satz mit «Erneut versuchen» (`AdminLoading`). **Fehler:** die Fehlerseite des Admins.
- **«Nächster Fall»** öffnet, was `nextCase` liefert: den dringendsten, ältesten Fall, der frei oder mir zugewiesen ist; kritische Fälle nur für Trust & Safety. Taste **N** tut dasselbe, ausser der Fokus steht in einem Eingabefeld; der Hinweis steht sichtbar daneben und in `aria-keyshortcuts`. Gibt es keinen, steht «Kein freier Fall offen».
- **Zuständig** zeigt für die eigene Person «Ich», sonst den Namen des Kontos. Interne Namen erscheinen nur im Admin.
- Der Kern liefert höchstens 200 Fälle. Sind es so viele, bittet ein Hinweis, mit den Filtern einzugrenzen; eine Seitenblätterung folgt, falls die Zahl im Betrieb erreicht wird.

## Einzelfall

- **Kopf:** «Fall M-2026-00412 · Nachricht · Hoch», darunter Priorität, Status, Zuständig und Eingang. «Mir zuweisen», «Selbst übernehmen» (zugewiesen an jemand anderes) und «Freigeben» stehen nur für Personen, die den Fall entscheiden dürfen.
- **Hinweise:** «An Trust & Safety eskaliert am …» bei kritischen Gründen, «Inhalt seit … gesperrt» bei einer Sofortsperre.
- **Gemeldeter Inhalt:** Nachrichten bleiben verdeckt, bis jemand sie mit Grund aufdeckt (wie in Schritt 1.8, mit Audit-Eintrag). Für eine gemeldete Bewertung führt ein Link zum Fall der Bewertung. Für gemeldete Medien gibt es noch **keine Vorschau**: Die geschützte Route `/media/review/…` liefert nur Medien in Prüfung, ein gemeldetes Medium ist veröffentlicht oder gesperrt. Statt einer unscharfen Vorschau ohne geprüften Weg steht ein Hinweis; die Vorschau braucht eine Funktion im Kern (siehe «Offen»).
- **Meldung:** Grund, Text, Gemeldet, Gemeldet von; bei Meldungen über `/melden` die Adresse und die Kontaktadresse.
- **Verlauf des Kontos:** frühere Fälle gegen Konto und Profil (verlinkt) und Einschränkungen. Bei kritischen Fällen gibt der Kern den Verlauf nur Trust & Safety; alle anderen sehen dort einen Satz statt eines Fehlers.
- **Automatische Hinweise** aus der Skizze in v2 12.4 entfallen, solange es keine automatische Erkennung gibt.

## Entscheid

- Das Formular steht nur, wenn die Person entscheiden darf. Bei kritischen Fällen sieht die Moderation stattdessen «Entscheidet Trust & Safety».
- **Ergebnisse** nur aus `decisionsFor(targetType)` und nur, wenn das Recht dazu besteht: «Konto einschränken» mit `users.restrict`, «Konto sperren» mit `users.suspend`. Jede Option nennt ihre Folge für das Ziel.
- **Regel** ist Pflicht. «Kein Verstoss» bietet nur R-MOD-0 an und setzt sie vor; jede Massnahme bietet nur R-MOD-1 bis 8 an. Wechselt das Ergebnis, wird eine unpassende Regel geleert. Server und Kern prüfen dasselbe.
- **Begründung** Pflicht, mindestens 10 Zeichen. Prüfung beim Verlassen des Felds, Fehler am Feld und oben mit Sprunglinks, der Senden-Button bleibt aktiv.
- **«Konto einschränken»** verlangt die Wahl Nachrichten oder Termine; Einschränken und Sperren haben ein **optionales Ende** als Datum. Es gilt bis 23:59 Uhr Zürcher Zeit an diesem Tag; ohne Ende gilt die Massnahme, bis jemand sie aufhebt.
- Nach dem Speichern öffnet sich der nächste Fall, sonst die Warteschlange. Hat jemand anderes inzwischen entschieden, lädt die Seite mit dem Hinweis «Dieser Fall wurde bereits entschieden» neu.
- Jede Antwort des Kerns hat einen klaren Satz: bereits entschieden, passt nicht zum Fall, geschütztes Konto (interne Rolle), kein Konto hinter dem Inhalt, gleiche Person, fehlendes Recht. Jede Server Action ruft den Kern auf, der das Recht selbst prüft; `AdminForbiddenError` wird zum Formularfehler.
- **Entschiedene Fälle** zeigen Ergebnis, Regel, Begründung, wer und wann.
- **Einspruch gegen den Entscheid:** Text, Datum und Status. Offen und für Personen, die nicht selbst entschieden haben: «Einspruch stattgeben» oder «Einspruch abweisen» mit Begründung. Wer entschieden hat, sieht schon vorher «Über diesen Einspruch entscheidet jemand anderes».
- **Unter 1024 px** ist der Fall nur lesend, wie die anderen Admin-Seiten: Formulare und Zuweisung fehlen, ein Satz erklärt es.

## Einsprüche gegen Einschränkungen

- Eine zweite Ansicht derselben Seite, **`/admin/moderation?ansicht=sperren`**, als Tab «Einsprüche gegen Sperren». Sie gehört zur Moderation, weil dieselben Personen entscheiden und keine eigene Route nötig ist; der Bereich «Benutzer» kann direkt hierhin verlinken.
- Den Tab sieht, wer `users.restrict` hat. Wer die Einschränkung verhängt hat, sieht den Hinweis statt des Formulars; über Sperren entscheidet nur, wer sperren darf. «Stattgeben» hebt die Einschränkung sofort auf.

## Seite der Betroffenen

- **Nachrichten:** Eine ausgeblendete Nachricht erscheint beiden Seiten wie eine gelöschte, mit «Von der Moderation ausgeblendet», ohne Text, Bilder, Menü und Ansage. Ältere Seiten und der Ausgang übernehmen den Stand vom Server; neue Stände kommen wie bisher über die Echtzeit.
- **Eingeschränkt:** Statt des Composers, an «Nachricht schreiben», im Formular der Terminanfrage und an den Aktionen einer Anfrage (Termine und Studio) steht ein ruhiger Hinweis: «Dein Konto ist für Nachrichten eingeschränkt bis 12.12.2026.» mit «Grund und Einspruch ansehen». Der Composer zeigt ihn schon beim Öffnen, die anderen Stellen nach der Antwort des Kerns. Absagen bleibt möglich (Entscheid 0016).
- **Einstellungen:** Abschnitt «Einschränkungen» unter «Daten und Konto» (`/einstellungen/daten#einschraenkungen`), weil es das Konto betrifft. Ohne aktive Einschränkung erscheint er nicht: Ein leerer Abschnitt über Einschränkungen würde nur beunruhigen. Je Einschränkung Art, Regel in Worten, Begründung, seit und bis, dazu einmal «Einspruch erheben» (mindestens 20 Zeichen) und danach der Status.
- **Studio, Medien:** Ein durch einen Fall gesperrtes Medium zeigt auf seiner Detailseite Fall-ID, Regel, Datum und Begründung und einmal «Einspruch erheben». Den Fall sucht der Server über `appealableCaseFor`; der Browser nennt nur das Medium.
- **Gesperrtes Konto:** Die Anmeldung zeigt «Dieses Konto ist gesperrt.» mit dem Weg zum Kontaktformular (Kategorie «Einspruch gegen eine Sperre»), auch nach dem zweiten Faktor.

## Offen

- **Vorschau gemeldeter Medien** für die Moderation: braucht im Kern eine geprüfte Auslieferung (zum Beispiel `resolveReportPreview` für Personen mit `moderation.cases`, nur bei einem Fall zu diesem Medium, mit Audit-Eintrag).
- **Einsprüche gegen Einschränkungen:** `listRestrictionAppeals` liefert weder Begründung noch Text des Einspruchs; die Oberfläche liest sie nach der Rechteprüfung des Kerns direkt. Besser wäre, der Kern gäbe beides mit.
- **Posteingang:** Die Vorschau der letzten Nachricht zeigt eine ausgeblendete Nachricht noch als «Nachricht gelöscht», weil der Kern beide Fälle zusammenlegt.
