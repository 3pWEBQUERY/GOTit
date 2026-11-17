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
