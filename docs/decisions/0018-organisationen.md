# 0018 Organisationen (Schritt 1.11)

**Stand:** 17.11.2026

## Grundlagen

Grundlage: PRD v2.0 Abschnitte 7.7, 7.8, 12.2, 12.4, 13 und PRD v1.0 FR-BUSINESS-001 bis 005, FR-VERIFY-003. Der Kern liegt in `packages/core/src/organization`.

- **Rollen und Rechte:** Jede Berechtigung ist einzeln definiert (`ORGANIZATION_PERMISSIONS`): Profil, Medien, Standorte, Anbieter einladen, Verknüpfungen lösen, Nachweise einreichen, Einstellungen. `ROLE_PERMISSIONS` ordnet sie zu: Inhaber alle; Standortmanager Standorte, Einladen, Lösen; Marketing und Redaktion Profil und Medien; Terminorganisation in Phase 1 keine. Es gibt bewusst keine Berechtigung für Nachrichten, Ausweisdaten oder private Kalender von Anbietern; keine Funktion der Organisation liest sie (Abnahme 1.11). Jede Schreibfunktion prüft Mitgliedschaft und Recht selbst; fremde und archivierte Organisationen verhalten sich wie unbekannte.
- **Nachweise (FR-VERIFY-003):** Firmenname laut Handelsregister, UID im Format `CHE-123.456.789`, Bestätigung der Berechtigung der handelnden Person, Bewilligungen in Worten. Keine Ausweise, keine Dokumente; die Moderation prüft die UID im öffentlichen Register. Eine offene Einreichung ist die einzige. Der Entscheid (Freigeben, Zur Korrektur, Ablehnen, Begründung ab 10 Zeichen) fällt atomar aus «Eingereicht» mit Audit-Eintrag. Freigeben veröffentlicht die Organisation, «Zur Korrektur» führt eine nie veröffentlichte zurück in den Entwurf, Ablehnen sperrt sie. Neue Angaben einer freigegebenen Organisation führen zu einer neuen Prüfung; sie bleibt bis dahin sichtbar.
- **Standorte (FR-BUSINESS-002):** Name, Beschreibung, freigegebene Region, allgemeine Ortsangabe (nie eine Adresse), Telefon, Website. Öffnungszeiten als Fenster pro Wochentag, mehrere pro Tag, ohne Überschneidung. **Wochentag 0 = Sonntag bis 6 = Samstag** wie bei der Verfügbarkeit der Anbieter (JavaScript `getDay`); Minuten 0 bis 1440. Ein Fenster liegt innerhalb eines Tages; eine Nacht von Freitag 22:00 bis 02:00 sind zwei Fenster (Freitag 22:00–24:00, Samstag 00:00–02:00). Ausnahmen pro Kalendertag (Europe/Zurich): geschlossen oder andere Zeiten, mit Notiz; ein Tag hat höchstens eine Ausnahme.
- **Verknüpfungen (FR-BUSINESS-003/005):** Die Organisation lädt per Profilname ein (nur veröffentlichte oder pausierte Profile, nie doppelt offen), optional mit Standort und Nachricht. Aktiv wird die Verknüpfung erst mit der Zustimmung des Anbieters (INVITED → ACTIVE oder DECLINED). Beide Seiten können lösen (ENDED mit `endedBy`); das Konto des Anbieters bleibt immer bestehen. Die Tabelle der Organisation enthält nur öffentliche Angaben: Anzeigename, Profilname, Region, Standort der Verknüpfung, Status, Daten.
- **Öffentliche Seite:** nur veröffentlichte Organisationen und nur öffentliche Daten; Anbieter erst nach Zustimmung und nur, wenn ihr Profil selbst öffentlich ist.
- **Medien der Organisation:** Ein Medium gehört genau einem Anbieterprofil oder genau einer Organisation (Prüfung in der Datenbank). Für Organisationen gilt `packages/core/src/media/organization-media.ts`: Hochladen, Ordnen, Alternativtext, Titelbild, Logo und Löschen nur mit «media.edit»; die Medien gehören der Organisation, nicht der hochladenden Person, und jedes Mitglied mit dem Recht verwaltet alle. Mitglieder ohne das Recht sehen sie nur. Medien einer anderen Organisation verhalten sich wie unbekannte. Medien einer Organisation sind immer öffentlich (keine Sichtbarkeit «Nur Mitglieder»), gehen durch dieselbe Moderation und erscheinen in `/admin/medien` mit dem Namen der Organisation. Titelbild und Logo gibt es je höchstens einmal, ein Bild ist nie beides; anders als bei Profilen wird kein Titelbild automatisch gesetzt.

## Oberfläche öffentlich und Verknüpfungen

Grundlage: PRD v2.0 Abschnitte 7.1, 7.6, 8.2, 9.1, 9.4, 10, 13 und PRD v1.0 FR-BUSINESS-001 bis 005, FR-VERIFY-004.

### Öffentliche Seiten

- **Routen:** `/c/[slug]` (Übersicht), `/c/[slug]/team` (alle verknüpften Anbieter), `/c/[slug]/standorte/[id]`, `/clubs`. Alle hinter der Altersprüfung des Marktplatzes.
- **404 vor dem Ladezustand:** Ein Layout prüft die Organisation (und beim Standort den Standort), bevor ein Ladezustand streamt. Entwürfe, eingereichte, gesperrte und archivierte Organisationen sowie unbekannte Standorte antworten mit 404. Die Übersicht liegt deshalb in der Gruppe `(profil)`, damit ihr Ladezustand Team und Standort nicht umschliesst.
- **Aufbau wie das Anbieterprofil (v2 9.4, 10):** Titelbild links, rechts Name, Art, Regionen, Logo, Vertrauenssignal und Kontakt; darunter Tabs «Übersicht» und «Anbieter» (aktiver Tab in der URL). Die Übersicht hat die Abschnitte Über uns, Standorte, Verknüpfte Anbieter (höchstens 8, sonst Link zu `/team`) und Galerie (alle weiteren Medien als Raster mit Lightbox; ohne weitere Medien entfällt der Abschnitt).
- **Vertrauenssignal:** «Geschäftsidentität geprüft» steht allein, getrennt von den Signalen der Anbieter (v1 FR-VERIFY-004). Die Erklärung nennt, was geprüft wurde (Firmenname, UID, Berechtigung), das Datum der letzten Freigabe und was das Signal nicht aussagt (nichts über die Anbieter, keine Garantie).
- **Kontakt:** Website, Telefon und öffentliche E-Mail als Links, nie die Anmeldeadresse eines Kontos. Dazu «Seite melden».
- **Metadaten:** Canonical auf die eigene Seite; `/team` ist `noindex` wie die Tabs des Profils.

### Verknüpfte Anbieter

- Nur aktive Verknüpfungen (nach Zustimmung) und nur Profile, die selbst öffentlich sind: veröffentlicht, im Suchindex, gültige Identitätsprüfung, für Besucher nur mit Sichtbarkeit «öffentlich». Eingeladene, abgelehnte, gelöste und pausierte erscheinen nicht.
- Karten wie in der Suche: ProfileCard mit Herz, höchstens zwei Signale, nur Angaben aus dem Suchindex.
- **Pro Standort:** Der Kern liefert pro Anbieter die Standorte seiner aktiven Verknüpfung (`locationIds`). Die Standortseite zeigt nur die Anbieter mit diesem Standort; Verknüpfungen ohne Standort erscheinen nur auf der Organisation.
- **Zahl auf `/clubs`:** zählt nur Anbieter, die auf der Seite auch erscheinen, damit die Liste nichts über nicht öffentliche Profile verrät.

### Öffnungszeiten

- **Wochentag 0 = Sonntag bis 6 = Samstag**, wie bei der Verfügbarkeit der Anbieter. Die Anzeige beginnt am Montag (v2 13).
- **Nach Mitternacht:** Ein Fenster liegt innerhalb eines Tages. Eine Nacht wie 22:00 bis 02:00 sind zwei Fenster (Freitag 22:00–24:00, Samstag 00:00–02:00). Die Wochentabelle fügt sie am Vortag zu «22:00–02:00» zusammen.
- **Ausnahme:** ersetzt die Zeiten ihres Tages ganz (geschlossen oder anderes Fenster). Gezeigt werden die nächsten abweichenden Tage mit Notiz.
- **Heute** rechnet in Europe/Zurich: «Heute geöffnet bis 02:00» (jetzt offen, auch in der Nacht vom Vortag), «Heute geöffnet von … bis …», «Heute nicht mehr geöffnet», «Heute geschlossen». Die Berechnung ist eine reine Funktion mit Unit-Tests.

### `/clubs` und Entdecken

- PRD 7.1 nennt `/clubs` «Suche mit Voreinstellung». Der Suchindex enthält heute nur Anbieter; `/clubs` ist deshalb eine eigene Liste aus dem Kern mit den Filtern Art (`?art=club|agentur`) und Region (`?region=<slug>`). Ein Kanton findet auch die Standorte in seinen Städten. Ob Organisationen in den Suchindex kommen, ist offen.
- Leerzustände unterscheiden «keine Treffer für diese Filter» (mit «Filter zurücksetzen») von «noch nichts veröffentlicht».
- **Entdecken:** Reihe «Clubs in der Nähe» für die gewählte Region, kompakte Liste in zwei Spalten, höchstens 6 Einträge; ohne Einträge entfällt sie (v2 9.1).

### Querverweis Profil ↔ Club (v2 8.2)

- Auf `/p/[name]` steht der Abschnitt «Verknüpft mit» (Wortlaut aus v2 10) mit den veröffentlichten Organisationen einer aktiven Verknüpfung, vor den Bewertungen. Ohne Verknüpfung entfällt er. Er gehört nicht zur geteilten Profilansicht, also nicht in die Vorschau im Studio.
- Die Clubseite verlinkt jeden Anbieter auf sein Profil.

### `/studio/verknuepfungen`

- Offene Einladungen mit Name (Link auf `/c/[slug]` nur bei veröffentlichter Organisation, sonst der Hinweis «Seite noch nicht veröffentlicht»), Art, Standort, Datum und Nachricht; «Annehmen» und «Ablehnen» wirken sofort mit Toast.
- Aktive Verknüpfungen mit «Verknüpfung lösen». Lösen ist nicht umkehrbar (es braucht eine neue Einladung) und verlangt einen Dialog, der die Folge nennt: «Dein Konto und dein Profil bleiben bestehen» (v1 FR-BUSINESS-005, v2 13).
- Ein Hinweis sagt, was die Organisation sieht: nur öffentliche Profilangaben, nie Nachrichten, Ausweisdaten, Anfragen oder Kalender.
- Die Seitenleiste des Studios hat den Eintrag «Verknüpfungen» mit der Zahl offener Einladungen, im Muster der ungelesenen Nachrichten.

### Medien der Organisation

- `/media/[id]/[variante]` liefert Medien einer Organisation öffentlich aus, solange die Organisation veröffentlicht ist und das Medium freigegeben und öffentlich ist. Sonst gilt die Regel für Eigentümer und Mitglieder.

## Oberfläche Studio und Admin

Was die PRD offenlässt, ist so entschieden:

- **Seitenleiste:** Phase 1 zeigt Heute, Unternehmensprofil, Standorte, Anbieter, Medien, Nachweise, Einstellungen in der Reihenfolge von v2 12.2. Team, Kalender, Angebote, Statistik, Werbung und Abrechnung erscheinen erst mit dem Flag `business-suite` (Phase 2), wie im Anbieter-Studio.
- **404 vor dem Ladezustand:** Das Layout `/studio/o/[org]` prüft die Mitgliedschaft; Standort- und Mediendetail prüfen im eigenen Layout, ob das Objekt zur Organisation gehört. Heute liegt in der Gruppe `(heute)`, damit sein Ladezustand die anderen Seiten nicht umschliesst.
- **Fehlende Rechte:** Aktionen, die die Rolle nicht hat, fehlen; ein Hinweis am Ort nennt, welche Rollen sie haben («Bearbeiten können Inhaber und Standortmanager»). Formulare erscheinen dann deaktiviert ohne Speichern-Button, damit die Angaben lesbar bleiben.
- **Heute:** Aufgaben nach Dringlichkeit: Nachweise (fehlen, Korrektur verlangt mit Begründung, in Prüfung, abgelehnt), «Noch kein Standort», «Einladungen offen: n».
- **Profil:** ein Formular mit Speichern-Button, Prüfung beim Verlassen mit dem Schema des Kerns, Fehler am Feld und zusammengefasst oben. Darüber der Stand von Veröffentlichung und Nachweisen, bei veröffentlichter Organisation der Link auf `/c/[slug]`.
- **Nachweise:** Stand mit Datum und Begründung; darunter, was geprüft und was nicht gespeichert wird. Während einer offenen Prüfung kein Formular; danach «Angaben neu einreichen», vorausgefüllt bis auf die Bestätigung der Berechtigung, die jedes Mal neu verlangt wird.
- **Standorte:** Liste mit Region, Zahl der Öffnungstage und Anbietern. «Standort hinzufügen» im Dialog (Angaben ohne Zeiten), danach weiter zur Detailseite. Die Detailseite hat getrennte Abschnitte mit eigenem Speichern: Angaben, Öffnungszeiten (der `AvailabilityEditor` aus `@app/ui`, Montag zuerst; die Umrechnung auf 0 = Sonntag ist dieselbe wie bei der Verfügbarkeit, 23:59 gilt als Mitternacht), Ausnahmen (Tag, geschlossen oder andere Zeiten, Notiz; Entfernen nach Rückfrage), zugeordnete Anbieter (eingeladen oder aktiv, nur öffentliche Angaben) und Löschen mit Dialog, der die Folge nennt. Über Mitternacht teilt die Person die Zeit selbst auf zwei Tage; der Hinweis über dem Editor sagt das.
- **Anbieter:** Tabelle mit Name (Link auf das Profil), Region, Standort, Status als Wort mit Icon und Einladungsdatum; unter 768 px Karten. «Einladen» im Dialog: Profilname oder eingefügte Profil-URL (der Name wird aus `/p/[name]` gelesen, auch mit Sprachpräfix und Unterseite), optional Standort und Nachricht. «Zum Namen gibt es kein öffentliches Profil» und «schon eingeladen oder verknüpft» stehen am Feld. Eingeladene lassen sich mit «Einladung zurückziehen», aktive mit «Verknüpfung lösen» beenden, beides nach Rückfrage. Abgelehnte und gelöste Verknüpfungen bleiben als Verlauf in der Tabelle.
- **Medien:** dieselbe Bibliothek wie im Anbieter-Studio (`features/media`), parametrisiert über `MediaScope`: Die Server Actions nehmen optional `org` an und rufen dann die Funktionen der Organisation. Für Organisationen fehlt die Wahl der Sichtbarkeit; dafür gibt es «Als Logo festlegen» im Menü und auf der Detailseite. Ohne «media.edit» ist das Raster nur lesbar (kein Upload, kein Ziehen, kein Menü), und die Detailseite antwortet mit 404.
- **Einstellungen:** In Phase 1 ehrlich ohne Formular: Art und Adresse der Organisation (ändert der Support), die eigene Rolle mit ihren Rechten, die öffentlichen Kontaktangaben mit Link ins Profil, und der Satz, dass Benachrichtigungen mit dem Modul Benachrichtigungen kommen.
- **Admin `/admin/organisationen`:** Warteschlange der eingereichten Nachweise, älteste zuerst, mit «Nächster Fall» und Taste N; Seitenleiste mit Zahl offener Prüfungen. Zugang wie bei Meldungen und Bewertungen (Moderation, Trust & Safety, Plattform-Administration, Super Admin); Support sieht den Hinweis. Der Fall zeigt Einreichung und Unternehmensprofil, einen Link auf das UID-Register und den Entscheid mit Begründung; ab 1024 px entscheidbar, darunter lesend. Einen Regelbezug wie bei Medien gibt es nicht, weil der Kern ihn für Nachweise nicht kennt; die Begründung steht im Audit-Log.

## Grenzen und offene Punkte (Lead)

- **Einladungen:** höchstens 20 pro Stunde und Konto (`organizationInvite`), gegen Massen-Einladungen (v2 16.2).
- **Medien einer Organisation** hängen technisch am Konto der Person, die sie hochgeladen hat. Wird dieses Konto endgültig gelöscht, verschwinden sie mit. Gewollt wäre, dass sie bei der Organisation bleiben. Das braucht eine Änderung am Datenmodell und ist als offener Punkt in der Übergabe 1.11 vermerkt.
- **Regel beim Entscheid über Nachweise:** Anders als bei Profilen, Medien und Bewertungen gibt es keine Regel als Schlüssel, nur die Begründung. Für Phase 1 genügt die Begründung im Audit-Log.
