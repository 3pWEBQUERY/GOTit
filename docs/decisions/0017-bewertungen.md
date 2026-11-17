# 0017 Bewertungen (Schritt 1.10)

**Stand:** 17.11.2026

Grundlage: PRD v2.0 Abschnitte 3, 7.3, 7.5, 7.8, 10, 10.1, 12.1, 12.4, 17 (Schritt 1.10) und PRD v1.0 FR-REVIEW-001 bis 005.

## Wer bewerten darf

- **Voraussetzung:** Bewerten darf nur das Mitglied eines Termins, den eine Seite als «Stattgefunden» bestätigt hat. Abgesagte, abgelehnte, abgelaufene, strittige und nur bestätigte Termine reichen nicht.
- **Umfang und Frist:** Pro Termin gibt es eine Bewertung, bis 30 Tage nach dem Ende des Termins.
- **Prüfung im Kern und in der Datenbank:**
  - Der Kern prüft diese Regel.
  - Zusätzlich prüft die Datenbank per Trigger: Der Termin ist «Stattgefunden», das Konto ist sein Mitglied, und das Profil stimmt.
  - Termin, Autor und Profil lassen sich danach nicht mehr ändern.
  - So gilt die Abnahme «auch nicht über die API» für jeden Weg in die Datenbank.
- **Nur Mitglieder bewerten Anbieter.** Anbieter bewerten Mitglieder nicht; das schützt vor Vergeltungsbewertungen (v1 FR-REVIEW-005).

## Inhalt

- **Kategorien:** vier (v2 12.1: Kommunikation, Zuverlässigkeit der Profilangaben, Organisation, Gesamteindruck), je 1 bis 5, dazu Freitext von 20 bis 2000 Zeichen.
- **Hinweis über dem Textfeld:** Er nennt, was nicht hineingehört, nämlich intime Details und Angaben, die jemanden identifizieren (v2 12.1).
- **Öffentlich:** Datum der Veröffentlichung, Verifikationsart «Nach bestätigtem Termin» (v1 FR-REVIEW-004), die vier Kategorien und der Text. Nie der Name des Autors.
- **Keine Sternesumme** im Profilkopf und auf Karten (v2 10.1 und Abschnitt 18). Die Zahl der Bewertungen erscheint im Tab.
- **Tarife:** Bezahlte Tarife beeinflussen nichts davon (v2 3).

## Moderation

- **Erst nach Freigabe öffentlich:** Jede Bewertung wird erst nach der Moderation öffentlich (v1 «authentifizierte, moderierte Bewertungen»). Das schützt vor Erpressung und Manipulation, weil eine Drohung mit einer Bewertung ins Leere läuft.
- **Entscheide:** Freigeben, Ablehnen, später Entfernen, jeweils mit Regel und Begründung im Audit-Log. Die Regeln:
  - R-REV-1: zulässig.
  - R-REV-2: intime oder sensible Details.
  - R-REV-3: identifizierende oder gefährdende Angaben.
  - R-REV-4: rechtswidrig oder persönlichkeitsverletzend.
  - R-REV-5: Erpressung, Vergeltung oder Manipulation.
- **Wer moderiert:** wie bei den Meldungen Super Admin, Plattform-Administration, Moderation und Trust & Safety, jeweils mit zweitem Faktor.
- **Gleichzeitige Entscheide:** Zwei gleichzeitige Entscheide ergeben einen Gewinner.

## Stellungnahme, Einspruch, Melden

- **Stellungnahme:** Der Anbieter kann zu einer veröffentlichten Bewertung eine Stellungnahme schreiben, ändern oder entfernen. Sie steht direkt unter der Bewertung (v2 10.1).
- **Einspruch des Anbieters:** gegen eine veröffentlichte Bewertung. Die Moderation entfernt sie oder weist den Einspruch ab.
- **Einspruch des Autors:** gegen eine abgelehnte oder entfernte Bewertung. Die Moderation gibt sie frei oder weist den Einspruch ab.
- **Einsprüche je Seite:** Je Seite ist ein offener Einspruch möglich.
- **Melden:** Jedes angemeldete Konto kann eine veröffentlichte Bewertung melden; die Kopie des Texts hängt am Fall in `/admin/meldungen` (v2 10.1).

## Suche

- **Index:** Der Suchindex zählt veröffentlichte Bewertungen.
- **Filter «Mit Bewertungen»:** zeigt Profile mit mindestens einer veröffentlichten Bewertung (v1 FR-SEARCH-002). Die Zahl beeinflusst das Ranking nicht.

## Grenzen

- **Pro Konto:** 10 Aktionen pro Stunde für Schreiben, Stellungnahme und Einspruch.
- **Erkennung von Manipulation** (v1 FR-REVIEW-005, P1): Sie beschränkt sich heute auf die Voraussetzung eines stattgefundenen Termins, die Moderation vor der Veröffentlichung und eine Bewertung pro Termin. Eine automatische Erkennung von Mustern, etwa vieler neuer Konten, folgt mit der allgemeinen Moderation in Schritt 1.13.

## Oberfläche

Was die PRD offenlässt, ist so entschieden:

- **Kategorien im Formular:** je eine Gruppe aus fünf Optionsfeldern 1 bis 5, nebeneinander, mit einem Satz zur Skala darüber («1 heisst schlecht, 5 heisst sehr gut») und einer Frage pro Kategorie. Sichtbar steht die Zahl; für Screenreader heisst jede Option zum Beispiel «Kommunikation, 4 von 5». Keine Sterne, keine Vorauswahl.
- **Hinweis über dem Textfeld:** ein eigener Kasten zwischen den Kategorien und dem Feld, mit dem Feld über `aria-describedby` verbunden. Darunter Zähler und Grenzen (20 bis 2000 Zeichen).
- **Prüfung vor dem Senden:** im Browser mit denselben Grenzen wie im Kern. Fehler stehen am Feld und als Liste oben mit Sprunglinks; der Fokus geht zum ersten Fehler. So kostet ein unvollständiges Formular keinen der zehn Versuche pro Stunde.
- **Nach dem Senden:** weiter zu `/bewertungen?gesendet=1`, dort oben «Danke. Die Bewertung wird geprüft und erscheint nach der Freigabe.» und in der Liste der Status «Wird geprüft». Das Formular selbst zeigt danach ehrlich «Du hast diesen Termin schon bewertet».
- **Nicht bewertbare Termine:** «noch nicht stattgefunden», «schon bewertet» und «Frist abgelaufen» sind eigene Zustände mit einem Weg zurück. Fremde und unbekannte Termine, auch für den Anbieter des Termins, sind eine 404.
- **`/termine/[id]`:** nach «Stattgefunden» ein Abschnitt «Bewertung» mit «Bewertung schreiben», danach «Bewertung geschrieben» mit Link zum Status, nach der Frist ein Satz. Die Liste `/termine` bleibt ohne eigenen Button, weil jede Zeile schon ein Link ist; die offenen Termine stehen oben auf `/bewertungen`.
- **`/bewertungen`:** zuerst «Wartet auf deine Bewertung», dann «Deine Bewertungen» mit Status als Wort und Statusanzeige, einem Satz, was der Status bedeutet, und «Einspruch erheben» bei «Abgelehnt» und «Entfernt». Die Begründung der Moderation bleibt intern.
- **Profil:** Tab «Bewertungen» mit der Zahl der veröffentlichten Bewertungen; auf der Übersicht der Abschnitt «Bewertungen (n)» mit den neuesten drei und «Alle ansehen», nur wenn es mindestens eine gibt. Der Tab zeigt bis zu 50, mit Hinweis, wenn es mehr gibt, und sonst «Noch keine Bewertungen». Datum ist das der Veröffentlichung. Die vier Kategorien stehen als «Kommunikation 4 von 5» nebeneinander; einen Durchschnitt gibt es nirgends.
- **Melden:** «Bewertung melden» unter jeder Bewertung, im Meldedialog der Nachrichten (Grund, dann optional Beschreibung). Besucher gehen zur Anmeldung mit Rückweg. Der Inhaber meldet auf dem eigenen Profil nicht; er sieht dort den Weg zu Stellungnahme und Einspruch im Studio.
- **Studio:** Seitenleiste mit «Bewertungen» nach «Anfragen». Pro Bewertung Status, Inhalt wie öffentlich, «Stellungnahme schreiben» oder «bearbeiten» als Formular mit «Speichern», «Stellungnahme entfernen» mit Rückfrage, weil der Text verloren geht. «Einspruch erheben» als Dialog mit Grund (mindestens 10 Zeichen); danach «Einspruch läuft», nach dem Entscheid «Letzter Einspruch: angenommen» oder «abgewiesen». Entfernte Bewertungen bleiben mit «Entfernt» sichtbar, ohne Aktionen.
- **Admin:** «Bewertungen» in der Seitenleiste für alle internen Rollen, die Zahl offener Fälle (neue Bewertungen und offene Einsprüche) nur für Moderationsrollen. Die Warteschlange führt beides in einer Tabelle mit «Art» (neue Bewertung, Einspruch des Anbieters, Einspruch des Autors), älteste zuerst, ohne Text und ohne Autor; «Nächsten Fall öffnen» und Taste N wie bei Medien und Meldungen. Der Fall zeigt die Bewertung wie öffentlich, Termin mit Beginn, Ende und Status, letzten Entscheid und alle Einsprüche mit Grund. Das Formular bietet nur die Entscheide, die aus dem Status möglich sind; je offenem Einspruch gibt es «Einspruch abweisen» mit eigener Begründung. Entschieden wird wie bei Medien erst ab 1024 px.
- **Meldungen:** Eine gemeldete Bewertung heisst in `/admin/meldungen` «Bewertung» und nennt das Profil; der Fall verlinkt auf `/admin/bewertungen/[id]`. Die Kopie des Texts liegt am Fall, die Ansicht der Kopie bleibt den Nachrichten vorbehalten.
