# 0022 Admin-Bereiche, Hilfe, Kontakt und Melden (Schritt 1.13)

**Stand:** 17.11.2026

Grundlage: PRD v2.0 Abschnitte 7.3, 7.8, 12.4 und 13 sowie PRD v1.0 Abschnitte 9.1, 9.2, 9.5, 9.6, 9.7 und 20.6. Rollen und Rechte stehen in Entscheid 0020, die Moderation in Entscheid 0021.

## Wege und Seitenleiste

- **Bereiche** nach v2 7.8: Übersicht, Benutzer, Anbieter, Unternehmen, Verifizierungen, Medien, Moderation, Bewertungen, Regionen, Kategorien, Inhalte, SEO, Support, System.
- **Seitenleiste:** Sie zeigt nur Bereiche, für die die Person ein Recht hat (`permissionsOf`). Für Verifizierungen und Medien gilt die Prüfrolle, für Unternehmen, Moderation und Bewertungen die Moderationsrolle, wie auf den Seiten selbst.
- **System** ist ein Eintrag. `/admin/system` leitet zur ersten Unterseite mit Recht weiter (Flags, Rollen, Audit, Status). Die Unterseiten haben Links als Tabs; die aktive steht in der URL.
- **Unternehmen:** Die Prüfung der Organisationen aus Schritt 1.11 liegt jetzt unter `/admin/unternehmen` und `/admin/unternehmen/[id]`, wie in der PRD.
  - `/admin/organisationen` und `/admin/organisationen/[id]` leiten dauerhaft weiter (308, `next.config.ts`).
  - Der Bereich bleibt die Warteschlange der eingereichten Nachweise. Eine Liste aller Organisationen folgt, wenn sie gebraucht wird; Anbieterprofile stehen unter `/admin/anbieter`.
- **Jede Seite** prüft ihr Recht selbst und zeigt ohne Recht den Hinweis «Kein Zugriff mit deiner Rolle» mit dem Satz, wer den Bereich nutzt. Nie eine 403.
- **Jede Server Action** ruft den Kern auf. Dessen `AdminForbiddenError` wird zum Formularfehler «Deine Rolle darf das nicht. Es wurde nichts gespeichert.» (`features/admin/areas/run-action.ts`).
- **Unter 1024 px** ist der Admin nur lesend. Formulare und Knöpfe, die etwas ändern, stehen erst ab 1024 px; darunter steht ein Hinweis (`WideOnly`).

## Formulare und Tabellen

- **Formulare:** Ein gemeinsames Formular (`AdminForm`) mit Label über dem Feld, Hinweis darunter und Prüfung beim Verlassen.
  - Fehler stehen am Feld und oben mit Sprunglinks; der Fokus geht zum ersten Fehler.
  - Der Senden-Button ist nie deaktiviert. Eingaben bleiben bei Fehlern stehen.
  - Begründungen haben mindestens 10 Zeichen, wie im Kern.
- **Tabellen:** dichte `DataTable` mit 40 px Zeilen und haftender Kopfzeile. Unter 768 px wird jede Zeile zur Karte.
- **Suche, Filter und Auswahl** stehen in der URL, als GET-Formular, das auch ohne JavaScript geht:
  - Benutzer: `q`, `filter`, `cursor`.
  - Anbieter: `q`, `status`, `cursor`.
  - Inhalte: `art`, `sprache`.
  - Support: `status`, `zustaendig`.
  - Audit: `person`, `aktion`, `ziel`, `von`, `bis`, `cursor`.
  - Bearbeiten: `?region=`, `?bearbeiten=`, `?konto=`, `?pfad=&sprache=`.
- **Blättern** mit Cursor: «Nächste Seite» und «Zur ersten Seite»; im Audit «Ältere Einträge».
- **Leer** unterscheidet «noch nichts» von «keine Treffer» (mit «Filter zurücksetzen»). **Laden** zeigt das Skelett der Tabelle oder des Einzelfalls. **Fehler** zeigt die Fehlerseite des Admins.

## Übersicht (v1 9.1)

- **Kacheln** aus `getPlatformOverview`, jede mit Link zur Warteschlange, wenn die Person sie öffnen darf:
  - Neue Konten in 7 Tagen, mit Vergleich in Worten («3 mehr als in den 7 Tagen davor (5)»).
  - Aktive Anbieterprofile, offene Prüffälle, offene Fälle der Moderation (mit Zahl der kritischen), Einsprüche gegen Einschränkungen, Bewertungen und Medien in Prüfung, eingereichte Unternehmen, offene Supportanfragen.
  - Sicherheitswarnungen der letzten 24 Stunden nach Art.
- **Abonnements und Zahlungen:** «Kommt mit Phase 2».
- **Technische Fehler:** ein Satz, dass sie in den Logs von Railway stehen, mit Link zum Dienststatus.

## Benutzer (v1 9.2)

- **Liste:** Benutzer, E-Mail, Kontotyp, interne Rollen, Status, angelegt.
  - Ist ein Konto gesperrt, steht nur «Gesperrt», nicht dazu noch Nachrichten und Termine.
  - Ohne Benutzername steht «Ohne Benutzername»; den Namen aus der Anmeldung zeigt der Admin nicht.
- **Detail:**
  - Konto, Identitätsprüfung (nur wenn der Kern sie liefert, also für Prüfrollen), interne Rollen, Profil und Organisationen.
  - Verlauf aller Einschränkungen mit Regel, Begründung, Zeitraum, Stand und Einspruch.
  - Die letzten zehn Sicherheitsereignisse.
  - Der Aufruf schreibt `user.viewed` ins Audit-Log (Kern).
- **Massnahmen:**
  - «Einschränken» (Nachrichten oder Termine) mit `users.restrict`, «Sperren» mit `users.suspend`, jeweils mit Regel, Begründung und optionalem Ende.
  - Das Ende ist ein Tag; die Massnahme gilt bis 23:59 Uhr Zürcher Zeit, wie in der Moderation.
  - Regeln: R-MOD-1 bis R-MOD-8 mit den Texten unter `moderation.rules`. R-MOD-0 («Kein Verstoss») steht hier nicht zur Wahl.
- **Sperren** fragt vorher in einem Dialog nach und nennt die Folgen: Alle Sitzungen enden, die Anmeldung ist gesperrt, das Profil ist nicht mehr öffentlich, und der Einspruch geht über das Kontaktformular.
- **Aufheben:** mit Begründung, je aktiver Massnahme und nur mit dem passenden Recht.
- **Einsprüche:** Offene Einsprüche verlinken auf `/admin/moderation?ansicht=sperren`; dort entscheidet die Moderation (Entscheid 0021).
- **Rollen:** Die Super-Admin-Rolle bearbeitet Rollen auch direkt in der Detailansicht; andere sehen «Rollen vergibt nur ein Super Admin».

## Anbieter

- **Neue Kernfunktion** `listProvidersForAdmin` (`packages/core/src/admin/providers.ts`, Recht `providers.view`):
  - Liste mit Suche und Statusfilter, 50 pro Seite.
  - «Prüfung» meint den letzten Prüffall des Profils, nicht die Identitätsprüfung.
  - Abgedeckt im Rechte-Test `admin-access.integration.test.ts`.
- **Name** führt zur Detailansicht des Kontos. Veröffentlichte Profile haben einen Link aufs öffentliche Profil.

## Regionen und Kategorien (v1 9.5)

- **Regionen** als Baum: Kantone, darunter eingerückt ihre Städte. Spalten: Freigabe, «Rechtlich geprüft am … von …», Hervorhebung, Profile.
- **Bearbeiten** über `?region=<id>`:
  - Regeln: rechtlicher Hinweis, Bewilligungen, Inhaltsbeschränkungen, Hervorhebung 1 bis 999.
  - «Als geprüft markieren» mit Notiz; die Notiz steht im Audit-Log.
  - Freigeben oder Zurückziehen mit Begründung.
- **Ablehnungen des Kerns** stehen im Klartext: «Erst rechtlich prüfen» und «Kanton zuerst freigeben». Fehlt die Prüfung oder die Freigabe des Kantons, steht der Hinweis schon vor dem Absenden da.
- **Zurückziehen eines Kantons** nennt vorher, wie viele freigegebene Städte die Freigabe mitverlieren, und fragt in einem Dialog nach.
- **Kategorien:**
  - Tabelle nach Reihenfolge; `?bearbeiten=neu` legt an, `?bearbeiten=<id>` bearbeitet.
  - Felder: Slug, vier Namen, Reihenfolge.
  - Neue Kategorien sind nicht freigegeben. Zurückziehen nennt die Zahl betroffener Profile und fragt nach.

## Inhalte und SEO (v1 9.6)

- **Liste** nach Art (Hilfe, Recht, Seite) und Sprache, mit Status.
- **Editor:**
  - Felder: Art, Sprache, Slug, Titel, Kurztext, Text, Meta-Titel (70) und Meta-Beschreibung (160) mit Zählern.
  - Der Text hat die Tabs «Schreiben» und «Vorschau»; ein Tabwechsel verliert nichts.
  - Neue Seiten sind Entwürfe, ausser mit «Direkt veröffentlichen».
- **Veröffentlicht:** Eine veröffentlichte Seite trägt den Hinweis, dass Speichern sie sofort öffentlich ändert. Der Knopf heisst dann «Öffentlich speichern».
- **Aktionen:** Veröffentlichen und Zurückziehen sofort. Löschen fragt in einem Dialog nach und sagt bei veröffentlichten Seiten, dass die Adresse danach eine 404 ergibt.
- **Übersetzungen:** Eine Seite zeigt ihre Übersetzungen. «Französisch anlegen» öffnet den Editor mit Art und Slug vorausgefüllt.
- **Markdown:** Ein eigener, kleiner Leser (`apps/web/features/content/markdown.ts`, mit Unit-Tests) kennt Überschriften, Absätze, Listen, Links, fett, kursiv und Code im Text.
  - Es gibt kein HTML: Alles wird als Text von React maskiert.
  - Links nur mit `https:`, `http:`, `mailto:`, als Pfad oder als Anker; anderes bleibt Text.
  - `#` und `##` werden zu h2, weil h1 der Seitentitel ist.
  - Externe Links bekommen `rel="noopener noreferrer nofollow"`.
- **SEO:**
  - Tabelle aller Einträge (Pfad mit Sprache, Titel, Indexierung). Formular oben; `?pfad=&sprache=` lädt einen Eintrag.
  - Speichern mit demselben Pfad und derselben Sprache ersetzt ihn. Löschen fragt nach.
  - Wer den Pfad eines Eintrags ändert, legt einen neuen an; der alte bleibt, bis jemand ihn löscht.

## Support

- **Warteschlange:**
  - Nummer «S-123», Betreff, Kategorie, Status, Zuständig, Eingang, Einträge. Offene zuerst, darin die älteste zuerst (Kern).
  - Filter: Status und «Mir zugewiesen» oder «Niemandem zugewiesen».
- **Anfrage:**
  - Text der Anfrage, Verlauf mit «Interne Notiz» oder «Per E-Mail gesendet», Formular zum Antworten.
  - Über dem Formular steht, dass eine Antwort im Wortlaut an die Adresse geht und den Status auf «Beantwortet» setzt.
  - Daneben: Status, Kategorie, E-Mail, Konto (mit Link, wenn die Person Benutzer sehen darf), Sprache, Zuständig, «Mir zuweisen» oder «Zuweisung lösen», Status ändern.
  - Der Aufruf schreibt `support.viewed` (Kern).

## System

- **Flags:**
  - Je Flag: Zustand, was es schaltet (Community = Phase 3, Business-Suite = Phase 2), Häkchen «Eingeschaltet», Regionen zum Abschalten (Kantone und Städte) und Pflichtbegründung.
  - Ein Flag ist ein Formular mit Speichern-Knopf, kein Schalter, der sofort speichert, weil die Begründung Pflicht ist (PRD 13 «nicht mischen»).
- **Rollen:**
  - Konten mit interner Rolle, mit Rollen, zweitem Faktor («Fehlt, kein Zugang») und letzter Vergabe.
  - Suche nach einem Konto ohne Rolle; `?konto=<id>` öffnet die Bearbeitung.
  - Nur Super Admin (`roles.manage`). Das Audit-Log zeigt Rollen vorher und nachher.
- **Audit:**
  - Filter nach Konto-ID, Anfang der Aktion, Anfang des Ziels und Zeitraum (Tage in Zürcher Zeit, «bis» schliesst den Tag ein).
  - 100 Einträge pro Seite. Ohne Konto steht «System».
  - Das Log enthält keine Inhalte, nur Aktion, Ziel und Begründung.
- **Status:**
  - Postgres, Redis und Migrationen in einer Tabelle, die Queues mit wartend, aktiv, verzögert und fehlgeschlagen in einer zweiten.
  - Jeder Ausfall steht als «Fehler» mit Grund da, oben zusammengefasst.
  - «Erneut prüfen» lädt die Daten neu.

## Hilfe und Recht

- **Wege:**
  - `/hilfe` listet veröffentlichte Hilfeartikel (fehlende Übersetzungen auf Deutsch), mit Weg zu Kontakt und Melden.
  - `/hilfe/[slug]` (fr `/aide/[slug]`, it `/aiuto/[slug]`, en `/help/[slug]`). Unbekannte oder unveröffentlichte Slugs ergeben eine 404.
- **Rechtsseiten** `/recht/agb`, `/recht/datenschutz`, `/recht/impressum` und `/recht/richtlinien` (Art `LEGAL`, Slug wie der letzte Teil des Pfads). Ohne veröffentlichte Fassung: 404.
- **Richtlinien:** Der Seed hat eine Platzhalterseite `richtlinien` erhalten, nach der Regel der anderen Rechtsseiten. Die Regeln R-MOD-1 bis R-MOD-8 beziehen sich auf sie.
- **Stand:** Jede Seite zeigt «Stand: TT.MM.JJJJ» (letzte Änderung).
- **Deutsche Fassung:** Zeigt die Seite die deutsche Fassung, trägt der Artikel `lang="de"` und den Hinweis «Diese Seite gibt es noch nicht in deiner Sprache».
- **Metadaten:** Meta-Titel und Meta-Beschreibung, sonst Titel und Kurztext. Danach gilt ein Eintrag aus `/admin/seo` für den fertigen Pfad mit Sprache.
- **SEO für andere Seiten:** `withSeoOverride(metadata, path, locale)` in `apps/web/features/content/seo.ts`. Der Pfad ist der von `createHref(locale)(…)`, zum Beispiel «/fr/aide». Hilfe, Kontakt, Melden und die Rechtsseiten nutzen es schon; Landingpages können es in ihrem `generateMetadata` gleich aufrufen.

## Kontakt (`/kontakt`)

- **Felder:** Thema, E-Mail, Betreff (3 bis 150 Zeichen), Nachricht (20 bis 5000 Zeichen).
  - Mit Konto steht die Adresse des Kontos fest, der Kern verwendet ohnehin sie.
  - `?kategorie=appeal` wählt «Einspruch gegen eine Sperre» vor; dazu erscheint ein Hinweis, was der Einspruch braucht.
- **Grenzen:**
  - 5 Anfragen pro Stunde und Adresse (`supportTicket`, Schlüssel aus `x-real-ip`, gehasht).
  - Eingabefehler zählen nicht.
  - Ein unsichtbares Feld für Bots ergibt scheinbar Erfolg und legt nichts an.
- **Danach:** «Deine Anfrage hat die Nummer S-123» und der Satz, dass eine Bestätigung an die Adresse unterwegs ist.

## Melden (`/melden`)

- **Felder:**
  - Adresse des Inhalts, vorausgefüllt aus `?url=`.
  - Grund mit denselben Gründen und Texten wie der Meldedialog der App (`useReportDialog`).
  - Beschreibung und Kontaktadresse, beide freiwillig.
- **Dringende Gründe** (Minderjährigkeit, Ausbeutung, akute Gefahr) zeigen schon bei der Auswahl den Hinweis auf den Notruf 117.
- **Plattform:** Als Adressen dieser Plattform gelten der Host von `APP_URL` und der Host der Anfrage. Andere Adressen lehnt das Formular am Feld ab.
- **Grenzen:** 5 pro Stunde und Adresse (`publicReport`), Bot-Feld wie beim Kontakt.
- **Danach:**
  - Die Bestätigung sagt, was geschieht: Prüfung der Reihe nach, dringende Gründe sofort an Trust & Safety.
  - Verstösse führen zum Entfernen oder zur Einschränkung; Rückfragen nur, wenn eine Adresse angegeben ist.
- **Footer:** Er hatte «Inhalt melden» schon.

## Kleine Änderungen ausserhalb des Admins

- **`packages/core/src/admin/providers.ts`:** neu, mit Export in `admin/index.ts` und Eintrag im Rechte-Test. Sonst ist `packages/core` unverändert.
- **`packages/config/eslint/base.mjs`:** erlaubt die Einstiege `@app/core/admin/system`, `@app/core/geo/admin` und `@app/core/catalog/admin`. Sie sind eigene Einstiege, damit `@app/core/admin` und `@app/core/geo` ohne Redis und Suchindex auskommen.
- **`AreaRestricted`:** hat einen optionalen Titel des Hinweises (`alertTitle`); ohne ihn bleibt der bisherige Text.
- **Übersetzungen:** neue Namensräume `adminCommon`, `adminUsers`, `adminCatalog`, `adminContent`, `adminSupport`, `adminSystem` und `info`, damit `admin.json` der Moderation überlassen bleibt.
