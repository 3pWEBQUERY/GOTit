# Build-Prompt & PRD v2.0 – Premium-Marktplatz mit Community und Business-Suite

Nov 16, 2026 · @Alexander

## 1. Auftrag an den Coding-Agenten

Du baust eine Web-Plattform für den Schweizer Markt: einen Premium-Marktplatz für legale Escort- und Adult-Services mit integriertem sozialem Netzwerk und einer Business-Suite für Anbieter. Dieses Dokument ist deine verbindliche Spezifikation. Bei Widersprüchen gilt die Reihenfolge: Abschnitt 16 (Sicherheit und Recht) vor Abschnitt 4 (Umsetzungsregeln) vor allem anderen.

**Deine Rolle:** Senior Full-Stack-Engineer und Product Designer in einer Person. Du lieferst lauffähigen, getesteten Code, keine Platzhalter, keine Demo-Daten im Produktivpfad, keine TODO-Stubs.

**Arbeitsweise**

1. Lies das ganze Dokument, bevor du Code schreibst. Lies danach die aktuelle Dokumentation von Next.js, Prisma, Tailwind und Railway in der installierten Version. Verlasse dich nicht auf Erinnerung.
2. Arbeite in den Phasen aus Abschnitt 17. Eine Phase ist erst fertig, wenn ihre Abnahmekriterien als Tests grün sind.
3. Baue zuerst das Designsystem und die App-Shell (Abschnitte 5 und 6), dann Seiten. Keine Seite erfindet eigene Farben, Abstände, Schatten oder Komponenten.
4. Jede Seite und jeder Container hat die Zustände Laden, leer, bereit und Fehler (Abschnitt 13). Eine Seite ohne diese vier Zustände gilt als nicht gebaut.
5. Keine Datei über 600 Zeilen (Abschnitt 4). Wenn eine Datei wächst, teile sie nach Verantwortung, nicht nach Zeilenzahl.
6. Wenn eine Anforderung fehlt oder zwei sich widersprechen: Halte an, benenne die Lücke in einem Satz, schlage eine Lösung vor und warte bei rechtlich oder sicherheitsrelevanten Fragen auf Antwort. Bei reinen UI-Details entscheide selbst und dokumentiere den Entscheid in `docs/decisions/`.
7. Schreibe nach jeder Phase eine kurze Übergabe: was gebaut ist, was getestet ist, was offen bleibt. Behaupte nichts als geprüft, was du nicht ausgeführt hast.

**Die drei Produktbereiche sind gleichwertig:** Marktplatz, Anbieter-Studio (das Dashboard) und Community. Das Studio ist kein Admin-Panel hinter einem Login, sondern ein Modus derselben Anwendung in derselben Shell (Abschnitt 6).

## 2. Änderungen gegenüber PRD v1.0

v1.0 beschrieb, *was* die Plattform können soll. v2.0 legt zusätzlich fest, *wie sie aussieht, wie sie sich verhält und wie sie gebaut wird*. Die Funktionsanforderungen FR-AUTH bis FR-BUSINESS aus v1.0 gelten unverändert weiter und sind hier nicht wiederholt, ausser wo sie sich ändern.

| Thema | v1.0 | v2.0 |
| --- | --- | --- |
| Dashboard | Eigene Oberfläche («4 Hauptoberflächen») | «Studio» als Modus in derselben Shell wie der Marktplatz; gleiche Kopfzeile, gleiche Tokens, kein Seitenwechsel-Gefühl |
| Priorität Studio | P1, Kennzahlen P0 | Studio-Kern (Heute, Profil, Medien, Nachrichten, Kalender, Anfragen, Basisstatistik) ist P0 und gleichwertig zum Marktplatz |
| Glas-Effekte | «Keine dekorativen Glas- und Glanzeffekte» | Liquid Glass ist auf Mobile das Material der Navigationsebene. Das Verbot gilt weiter für die Inhaltsebene und für rein dekoratives Glas |
| Typografie | Offen | Inter für alle Überschriften, selbst gehostet, variabel |
| Navigation | 5 Punkte, keine Details | Desktop mit Mega-Menü für Entdecken und Community; Mobile mit schwebender Tab-Leiste |
| Hosting | «Containerbasiert», Cloudflare, S3-kompatibel | Railway für alles: Dienste, Postgres, Redis, Buckets, Cron |
| Suche | Meilisearch oder Typesense | Start mit Postgres-Volltext hinter einer Such-Schnittstelle; Meilisearch als Railway-Dienst, sobald nötig |
| Authentifizierung | Auth.js | Better Auth (Passkeys, 2FA, Sitzungen); gegen aktuelle Doku prüfen |
| Dateigrösse | Nicht geregelt | Harte Grenze 600 Zeilen pro Datei, per Lint und CI erzwungen |
| UI-Zustände | Nur als Komponentenliste | Pflichtzustände und Verhaltensregeln pro Container |
| Seiten | Nur Hauptbereiche | Vollständiges Routeninventar mit Navigationsbeziehungen |

**Bewusst gestrichen oder verschoben:** Enterprise-Tarif, Guthabenmodell, Forum, KI-Funktionen und Reels bleiben ausserhalb von Phase 1 bis 3. Sie bekommen Routen-Platzhalter in der Architektur, aber keinen Code.

## 3. Produktrahmen

**Positionierung:** Ein Marktplatz mit der Bedienbarkeit einer modernen Consumer-App und den Werkzeugen einer Business-Software. Er hebt sich von and6 und Kaufmich nicht über mehr Funktionen ab, sondern über drei Dinge: ein Studio, das Anbieter täglich öffnen wollen; Vertrauenssignale, die sauber von bezahlter Sichtbarkeit getrennt sind; und eine ruhige, hochwertige Oberfläche ohne Werbe-Überladung.

**Markt:** Start in ausgewählten Schweizer Regionen, vier Sprachen (de, fr, it, en). Deutschland und Österreich erst nach rechtlicher Freigabe pro Region.

**Rollen**

| Rolle | Kann | Sieht in der Shell |
| --- | --- | --- |
| Besucher | Suchen, öffentliche Profile und Clubs ansehen (nach Altersprüfung) | Marktplatz |
| Mitglied | Zusätzlich Favoriten, Nachrichten, Terminanfragen, Bewertungen, Community | Marktplatz + persönlicher Bereich |
| Einzelanbieter | Zusätzlich Profil, Medien, Kalender, Anfragen, Statistik, Werbung | Marktplatz + Studio |
| Club / Agentur | Organisation mit Standorten, Team, verknüpften Anbietern | Marktplatz + Studio im Organisations-Kontext |
| Interne Rollen | Super Admin, Platform Admin, Moderator, Trust & Safety, Support, Finance, Content Editor | Separate Admin-Anwendung unter `/admin` |

Eine Person hat ein Konto und kann mehrere Rollen tragen. Organisationen sind eigene Entitäten mit Mitgliedschaften.

**Nichtziele (unverändert aus v1.0):** keine Zahlungsabwicklung für persönliche Dienstleistungen, keine Durchführungspflicht für Termine, keine unmoderierten Anbieterprofile, kein Import fremder Profile, keine genauen Wohnadressen, kein Datenhandel, keine Bewertung von Profilen anhand besonders sensibler Daten.

**Schutzregeln, die jede Funktion einhalten muss**

- Ein Premium-Abo verändert nie einen Verifizierungs- oder Vertrauensstatus.
- Bezahlte Platzierungen sind immer als «Anzeige» beschriftet, in Text, nicht nur farblich.
- Eine Agentur übernimmt kein persönliches Profil ohne aktive Zustimmung, sieht keine privaten Nachrichten und keine Ausweisdaten. Der Anbieter kann die Verknüpfung jederzeit lösen und behält sein Konto.
- Jede Terminanfrage ist freiwillig; absagen geht immer, ohne Begründung.

## 4. Harte Umsetzungsregeln

### 4.1 Dateigrösse

- Zielgrösse pro Datei: bis 300 Zeilen. Harte Grenze: 600 Zeilen. Ab 601 Zeilen schlägt der Build fehl.
- Erzwungen durch ESLint `max-lines` (`max: 600`, Leerzeilen und Kommentare nicht mitgezählt) und zusätzlich `max-lines-per-function` mit 120 als Warnung.
- Ein CI-Schritt zählt alle `.ts`, `.tsx`, `.css`, `.prisma` und `.json`-Dateien unter `apps/` und `packages/` und bricht bei Überschreitung ab. Ausgenommen sind nur generierte Dateien (Prisma-Client, Lockfiles, Migrations-SQL).
- Das Prisma-Schema wird als Mehrdatei-Schema geführt (`prisma/schema/*.prisma`, eine Datei pro Modul).
- Übersetzungen liegen pro Sprache und Namensraum in eigenen Dateien (`messages/de/search.json`), nie in einer Sammeldatei.
- Teilen nach Verantwortung: Seite → Abschnitte → Komponenten → Hooks → Server-Funktionen → Schemas. Keine `utils.ts`-Sammelbecken, keine `part1.tsx`/`part2.tsx`.

### 4.2 Codequalität

- TypeScript `strict`, kein `any`, kein `@ts-ignore` ohne Begründung in derselben Zeile.
- Jede Eingabe wird am Rand mit Zod validiert (Formular, Server Action, Route Handler, Job-Payload). Ein Schema pro Vorgang, geteilt zwischen Client und Server.
- Autorisierung wird in jeder Server-Funktion geprüft, auf Objektebene, nie nur in der Oberfläche oder Middleware.
- Kein Code ohne Aufrufer, keine auskommentierten Blöcke, keine Beispiel-Daten im Produktivpfad. Seed-Daten liegen ausschliesslich in `packages/db/seed/` und sind als fiktiv erkennbar.
- Tests: Vitest für Domänenlogik und Berechtigungen, Playwright für die vier User Journeys, axe-Prüfung in jedem End-to-End-Test.
- Abhängigkeiten nur, wenn sie eine konkrete Anforderung erfüllen. Vor dem Hinzufügen: Wartungsstand und Lizenz prüfen.

### 4.3 Kein AI Slop in der Oberfläche

Die folgenden Muster sind verboten. Ein Review weist jede Seite zurück, die eines davon enthält.

| Verboten | Stattdessen |
| --- | --- |
| Farbverläufe auf Flächen, Buttons oder Text; violett-blaue Akzente | Flächen in einer Farbe, eine Akzentfarbe |
| Emoji als Icons, Sparkle-Symbole, «KI»-Abzeichen | Ein Icon-Set (Lucide), 1,5 px Strich, nur wo es die Erkennung beschleunigt |
| Karten in Karten, Schatten auf jeder Fläche, überall 16 px Radius | Fläche, Linie oder Abstand als Trennung; Schatten nur für schwebende Ebenen |
| Dashboard als Raster gleich grosser KPI-Kacheln | Eine priorisierte «Heute»-Liste, darunter wenige Kennzahlen mit Vergleichswert |
| Zentrierte Hero-Sektion mit Schlagwort, drei Feature-Karten, Testimonials | Startseite beginnt mit Suche und echten Profilen der Region |
| Platzhaltertexte, Lorem ipsum, erfundene Zahlen und Bewertungen | Echte Daten oder ein ehrlicher Leerzustand |
| Blindtext-Buttons («OK», «Weiter», «Mehr erfahren») | Verb + Objekt: «Anfrage senden», «Profil pausieren» |
| Spinner über ganzen Flächen | Skelette in der Form des Inhalts |
| Animation ohne Funktion, Parallax, schwebende Formen | Bewegung nur als Rückmeldung oder zur Orientierung, 150 bis 250 ms |
| Glas auf Karten, Listen oder Bildern | Glas nur auf der mobilen Navigationsebene (Abschnitt 5.5) |
| Stockfotos, generierte Porträts | Nur geprüfte Medien der Anbieter; sonst neutrale Fläche mit Initialen |

## 5. Designsystem

Die Richtung ist «ruhiges Hospitality-Produkt»: warmes Papierweiss, fast schwarze Tinte, ein tiefes Tannengrün als einziger Akzent, grosse Fotos, viel Luft. Bewusst kein Schwarz-Gold, kein Rot, kein Pink, kein Violett. Das sind die Farben der Branche und die Farben generierter Oberflächen; beides soll die Plattform nicht sein.

Alle Werte leben als CSS-Variablen in `packages/ui/src/tokens/` und werden von Tailwind 4 über `@theme` gelesen. Komponenten verwenden nur Token-Namen, nie Hex-Werte.

### 5.1 Farbe

| Rolle | Token | Hell | Dunkel | Kontrast auf Hintergrund (hell / dunkel) |
| --- | --- | --- | --- | --- |
| Hintergrund | `--bg` | #FAF8F5 | #141312 | – |
| Fläche | `--surface` | #FFFFFF | #1E1C1A | – |
| Fläche gedämpft | `--surface-2` | #F1EDE7 | #282523 | – |
| Text | `--ink` | #1A1816 | #F2EEE8 | 16,7 : 1 / 16,1 : 1 |
| Text sekundär | `--ink-muted` | #6B655E | #A39C93 | 5,4 : 1 / 6,8 : 1 |
| Linie | `--border` | #E4DED6 | #34302D | dekorativ |
| Linie für Bedienelemente | `--border-strong` | #8A837A | #7A736B | 3,5 : 1 (hell) |
| Akzent | `--accent` | #1F4D43 | #7FC4B0 | 9,0 : 1 / 9,2 : 1 |
| Text auf Akzent | `--on-accent` | #FFFFFF | #141312 | 9,5 : 1 / 9,2 : 1 |
| Fehler | `--error` | #A8321F | #F0907F | 6,3 : 1 / 8,0 : 1 |
| Warnung | `--warning` | #8A5A00 | #E5B55A | 5,6 : 1 / 9,8 : 1 |
| Erfolg | `--success` | #1E6B3A | #7CCB93 | 6,2 : 1 / 9,6 : 1 |
| Information | `--info` | #1F5A8A | #8CBDE8 | 6,9 : 1 / 9,3 : 1 |

Die Kontrastwerte sind nach WCAG berechnet. `--border-strong` im Dunkelmodus und jede spätere Änderung müssen neu gerechnet werden; ein Test in `packages/ui` prüft alle Text-Paare auf mindestens 4,5 : 1 und Bedienelement-Ränder auf 3 : 1.

**Regeln:** Akzent nur für die primäre Aktion pro Ansicht, für aktive Navigation und Fokus. Status nie nur über Farbe, immer mit Icon und Wort. Der Hinweis «Anzeige» und alle Verifizierungssignale sind neutral (Tinte auf Fläche), nicht grün: Grün würde «sicher» versprechen.

### 5.2 Typografie

Inter Variable für alle Überschriften und die gesamte Bedienoberfläche, geladen über `next/font` (wird beim Build selbst gehostet, keine Anfrage an Dritte), mit optischer Grösse (`opsz`) und `font-display: swap`.

| Stil | Desktop | Mobile | Gewicht | Laufweite |
| --- | --- | --- | --- | --- |
| Display | 40 / 44 | 30 / 34 | 650 | −0,03 em |
| H1 | 32 / 38 | 26 / 31 | 650 | −0,025 em |
| H2 | 24 / 30 | 21 / 26 | 600 | −0,02 em |
| H3 | 19 / 26 | 18 / 24 | 600 | −0,015 em |
| Text | 16 / 25 | 16 / 24 | 400 | 0 |
| Text klein | 14 / 20 | 14 / 20 | 400 | 0 |
| Label | 13 / 16 | 13 / 16 | 550 | 0,01 em |

- Eine H1 pro Seite. Überschriften in Satzschreibung, ohne Punkt.
- Zahlen in Tabellen, Preisen und Statistiken mit `font-variant-numeric: tabular-nums`.
- Fliesstext höchstens 68 Zeichen breit. Kein Text unter 13 px.
- Deutsche, französische und italienische Texte laufen bis 30 % länger als englische: Kein Label wird abgeschnitten, Buttons wachsen.

### 5.3 Raum, Form, Tiefe

- **Raster:** 4 px Basis. Abstände 4, 8, 12, 16, 24, 32, 48, 64, 96. Innenabstand von Flächen 16 (Mobile) und 24 (Desktop).
- **Seitenbreite:** Inhalt maximal 1280 px, Lesespalten 680 px. Breakpoints: 0, 480, 768, 1024, 1280, 1536.
- **Radien:** 6 (Chips, kleine Controls), 10 (Buttons, Felder), 16 (Karten, Medien), 28 (Sheets), voll (Tab-Leiste, Pillen). Verschachtelte Formen sind konzentrisch: Innenradius = Aussenradius minus Abstand.
- **Tiefe:** drei Ebenen. Inhalt (kein Schatten, Trennung durch Linie oder Fläche), erhöht (Menüs, Popover: ein weicher Schatten), schwebend (Dialoge, Sheets, mobile Navigation).
- **Bewegung:** 150 ms für Zustandswechsel, 250 ms für Ebenenwechsel, Kurve `cubic-bezier(0.2, 0, 0, 1)`. Bei `prefers-reduced-motion` nur Überblenden.
- **Fotos:** Profilkarten im Verhältnis 4 : 5, Titelbilder 16 : 9 (Desktop) und 4 : 5 (Mobile). Text steht unter dem Bild, nicht darauf. Bilder laden mit Platzhalter in der dominanten Farbe.

### 5.4 Komponenten

Basis sind shadcn/ui-Komponenten auf Radix-Primitiven, vollständig auf die Tokens umgestellt. Jede Komponente liegt in einer eigenen Datei in `packages/ui`, hat alle Zustände (Ruhe, Hover, Fokus, aktiv, deaktiviert, lädt, Fehler) und eine Testseite unter `/dev/ui` (nur ausserhalb der Produktion).

| Gruppe | Komponenten |
| --- | --- |
| Shell | `AppHeader`, `ModeSwitch`, `MegaMenu`, `StudioSidebar`, `GlassTabBar`, `GlassTopBar`, `Breadcrumbs`, `Footer`, `AgeGate`, `SkipLink` |
| Aktionen | `Button` (primär, sekundär, still, destruktiv), `IconButton`, `SplitButton`, `Menu`, `FloatingAction` |
| Eingabe | `TextField`, `TextArea`, `Select`, `Combobox`, `Checkbox`, `RadioGroup`, `Switch`, `Slider` (Preis, Umkreis), `DateField`, `TimeField`, `FileDrop`, `SearchField` |
| Suche | `FilterChip`, `FilterBar`, `FilterSheet`, `FilterPanel`, `ResultCount`, `SortMenu`, `ViewToggle`, `SavedSearchButton` |
| Profil | `ProfileCard` (Raster, Liste, kompakt), `TrustSignals`, `AvailabilityBadge`, `SponsoredLabel`, `MediaGallery`, `Lightbox`, `RateTable`, `ServiceList`, `ReviewItem`, `ContactBar` |
| Kommunikation | `ConversationList`, `MessageThread`, `Composer`, `TemplatePicker`, `ChatLabel`, `BookingRequestCard`, `ReportDialog` |
| Zeit | `CalendarMonth`, `CalendarWeek`, `CalendarDay`, `AvailabilityEditor`, `BookingTimeline`, `StatusPill` |
| Daten | `DataTable`, `StatFigure` (Wert, Vergleich, Zeitraum), `LineChart`, `BarChart`, `RangePicker`, `Pagination` |
| Community | `PostCard`, `PostComposer`, `StoryRing`, `StoryViewer`, `CommentThread`, `EventCard`, `TourCard`, `FollowButton` |
| Rückmeldung | `Toast` (mit Rückgängig), `InlineAlert`, `Banner`, `Skeleton`, `EmptyState`, `ErrorState`, `ProgressSteps`, `Dialog`, `Sheet`, `SidePanel`, `Tooltip` |

### 5.5 Liquid Glass auf Mobile

Unter 768 px Breite bildet Liquid Glass die Navigationsebene, die über dem Inhalt schwebt. Apples Vorgabe gilt wörtlich: Glas für Navigation und Bedienelemente, nie für Inhalt, nie Glas auf Glas ([Apple HIG, Materials](https://developer.apple.com/design/human-interface-guidelines/materials)).

**Aus Glas sind genau diese Elemente:** `GlassTabBar`, `GlassTopBar`, schwebende Aktionen (Filter, Kontakt, Neu), die Griffleiste von Sheets, die Chip-Leiste der Suche und der Composer im Messenger. Alles andere ist deckend.

**Verhalten**

- Die Tab-Leiste ist eine schwebende Kapsel, 12 px vom Rand, über der Safe Area. Beim Scrollen nach unten schrumpft sie auf Icons, beim Scrollen nach oben kommt sie zurück.
- Die Top-Leiste hat keinen Trennstrich. Inhalt läuft unter ihr durch und wird am Rand weich ausgeblendet.
- Sheets haben Stufen (halb, voll), runde obere Ecken mit 28 px und lassen sich am Griff ziehen. Ein Sheet auf halber Höhe ist Glas, auf voller Höhe deckend.
- Die primäre Aktion einer Ansicht darf als einziges Glas-Element mit Akzent getönt sein.
- Tippflächen mindestens 44 × 44 px.

**Umsetzung im Web** (Startwerte, auf echten Geräten über Fotos und über Text abstimmen):

```css
.glass {
  background: color-mix(in oklab, var(--surface) 62%, transparent);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid color-mix(in oklab, var(--ink) 10%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, white 55%, transparent),
    0 8px 32px color-mix(in oklab, black 14%, transparent);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--surface); }
}

@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .glass {
    background: var(--surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    border-color: var(--border-strong);
  }
}
```

- Text und Icons auf Glas müssen über hellem und über dunklem Inhalt 4,5 : 1 halten. Reicht die Tönung nicht, wird der Deckungsgrad erhöht, nicht die Schrift verändert.
- Echte Lichtbrechung (SVG-Displacement) ist nur als Zusatz in Browsern erlaubt, die sie flüssig darstellen. Die Oberfläche darf nie davon abhängen.
- Höchstens drei Glasflächen gleichzeitig sichtbar. Unschärfe kostet Leistung: Auf einem Mittelklasse-Android-Gerät muss das Scrollen der Suche flüssig bleiben, sonst wird der Blur-Radius gesenkt.
- Ab 768 px sind Kopfzeile und Seitenleiste deckend. Nur Mega-Menü und Popover dürfen dort eine leichte Unschärfe tragen.

## 6. App-Shell und Navigation

Es gibt eine Shell für Marktplatz, Community, Mitgliederbereich und Studio. Die Kopfzeile bleibt beim Wechsel zwischen ihnen stehen und wird nicht neu geladen. Nur die Admin-Anwendung hat eine eigene, dichtere Shell.

### 6.1 Wie das Studio im Marktplatz sitzt

1. **Ein Layout-Baum.** `/studio/*` liegt in derselben Next.js-App unter demselben Root-Layout wie der Marktplatz. Kopfzeile, Schrift, Tokens und Benachrichtigungen sind dieselben Instanzen.
2. **Modus statt Ortswechsel.** Anbieter sehen in der Kopfzeile den `ModeSwitch` mit zwei Segmenten: «Marktplatz» und «Studio». Der Wechsel schiebt die Studio-Seitenleiste von links ein (250 ms); die Kopfzeile bewegt sich nicht.
3. **Bearbeiten am Ort.** Auf dem eigenen öffentlichen Profil erscheint unter der Kopfzeile eine Eigentümer-Leiste: «So sehen Besucher dein Profil» mit «Bearbeiten» und «Statistik ansehen». «Bearbeiten» öffnet den Abschnitt als Seitenpanel über dem Profil, nicht auf einer anderen Seite.
4. **Rückweg überall.** Jede Studio-Ansicht mit öffentlichem Gegenstück hat «Im Marktplatz ansehen». Die Statistik verlinkt auf die Suche, in der das eigene Profil erschien.
5. **Eine Inbox, ein Kalender.** Nachrichten und Termine sind dieselben Module in beiden Modi. Im Studio kommen Labels, Vorlagen und Anfragen-Spalte hinzu.
6. **Eine Suche, eine Befehlspalette.** Das Suchfeld sucht in beiden Modi den Marktplatz. `Cmd/Ctrl + K` öffnet eine Palette, die Seiten beider Bereiche und eigene Chats findet.
7. **Kontext für Organisationen.** Wer zusätzlich Mitglied eines Clubs ist, wählt im `ModeSwitch` zwischen «Mein Profil» und der Organisation. Die Seitenleiste zeigt dann deren Bereiche.

### 6.2 Desktop-Shell (ab 1024 px)

```text
Marktplatz-Modus
+----------------------------------------------------------------------------------+
| Logo  [Marktplatz|Studio]  Entdecken v  Profile  Clubs  Community v  Mehr v      |
|                          [ Suche: Ort, Name, Kategorie          ]  Bell Msg Fav Me|
+----------------------------------------------------------------------------------+
| Breadcrumbs (ab Ebene 2)                                                         |
|                                                                                  |
|                         Seiteninhalt, max. 1280 px                               |
|                                                                                  |
+----------------------------------------------------------------------------------+
| Footer: Regionen | Sicherheit | Hilfe | Recht | Sprache | Darstellung            |
+----------------------------------------------------------------------------------+

Studio-Modus (gleiche Kopfzeile, Seitenleiste kommt hinzu, kein Footer)
+----------------------------------------------------------------------------------+
| Logo  [Marktplatz|Studio]  Entdecken v  Profile  Clubs  Community v  Mehr v      |
|                          [ Suche                                 ]  Bell Msg Fav Me|
+------------------+---------------------------------------------------------------+
| Heute            | Seitentitel                         [Primäre Aktion]          |
| Mein Profil      |---------------------------------------------------------------|
| Medien           |                                                               |
| Nachrichten   3  |                    Arbeitsbereich                             |
| Kalender         |                                                               |
| Anfragen      2  |                                                               |
| Beiträge         |                                                               |
| Statistik        |                                                               |
| Werbung          |                                                               |
| Abrechnung       |                                                               |
|------------------|                                                               |
| Profil: Online   |                                                               |
| [Pausieren]      |                                                               |
| Einstellungen    |                                                               |
+------------------+---------------------------------------------------------------+
```

- Kopfzeile 64 px, einzeilig ab 1280 px; zwischen 1024 und 1279 px rückt die Suche als Icon in die Aktionsgruppe.
- Seitenleiste 232 px, zwischen 1024 und 1279 px auf 64 px (Icons mit Tooltip) einklappbar. Der Zustand wird gemerkt.
- «Profil pausieren» sitzt dauerhaft unten in der Seitenleiste: ein Klick, sofort wirksam, mit Rückgängig.
- Besucher sehen statt der Aktionsgruppe «Anmelden» und «Als Anbieter starten». Mitglieder ohne Anbieterrolle sehen keinen `ModeSwitch`.

### 6.3 Mega-Menü

Zwei Punkte öffnen ein Mega-Menü, weil ihre Ziele in mehreren Dimensionen liegen. «Mehr» ist ein einfaches Menü.

```text
Entdecken
+-------------------+-------------------+-------------------+----------------------+
| Regionen          | Kategorien        | Jetzt             | Für dich             |
| Zürich            | (zentral gepflegt,| Heute verfügbar   | Gespeicherte Suchen  |
| Bern              |  max. 8 Einträge) | Neu dabei         | Zuletzt angesehen    |
| Basel             |                   | Auf Tour in deiner| Favoriten mit        |
| Genf              |                   | Region            | Änderungen           |
| Lausanne          | Alle Kategorien > | Mit geprüften     | (Besucher: Hinweis   |
| Alle Kantone >    |                   | Bewertungen       |  auf Konto)          |
+-------------------+-------------------+-------------------+----------------------+

Community
+-------------------+-------------------+-------------------+
| Lesen             | Unterwegs         | Mitmachen         |
| Feed              | Touren            | Beitrag schreiben |
| Stories           | Veranstaltungen   | Regeln            |
| Blogs             |                   | Melden und Hilfe  |
+-------------------+-------------------+-------------------+
```

- Öffnet auf Klick oder Enter, nicht allein auf Hover. Schliesst mit Escape, Klick ausserhalb und beim Verlassen per Tab; der Fokus geht zum Auslöser zurück.
- Umgesetzt als Disclosure-Navigation (`button` mit `aria-expanded`, Liste von Links), nicht als `role="menu"`.
- Volle Inhaltsbreite, maximal 4 Spalten, maximal 7 Links pro Spalte, keine Bilder, keine Werbung.
- Regionen und Kategorien kommen aus der Datenbank und zeigen nur freigegebene Einträge.
- Unter 1024 px gibt es kein Mega-Menü. Dieselben Ziele liegen im Entdecken-Sheet.

### 6.4 Mobile-Shell (unter 768 px)

```text
+--------------------------------+
| (Glas) Titel        Suche  Bell|   GlassTopBar, Inhalt läuft darunter durch
|  [Marktplatz|Studio]           |   nur für Anbieter, zweite Zeile, scrollt weg
|                                |
|                                |
|          Inhalt                |
|                                |
|                        (Glas)  |
|                        [ + ]   |   schwebende Aktion, kontextabhängig
|  +--------------------------+  |
|  | o     o     o     o    o |  |   GlassTabBar, Kapsel, schrumpft beim Scrollen
|  +--------------------------+  |
+--------------------------------+
```

| Zustand | Tab 1 | Tab 2 | Tab 3 | Tab 4 | Tab 5 |
| --- | --- | --- | --- | --- | --- |
| Besucher | Entdecken | Clubs | Community | Anmelden | – |
| Mitglied | Entdecken | Community | Nachrichten | Favoriten | Ich |
| Studio | Heute | Kalender | Nachrichten | Statistik | Mehr |

- «Nachrichten» steht in beiden Modi an dritter Stelle. Der Moduswechsel tauscht die übrigen Tabs mit einer Überblendung; die Leiste selbst bleibt.
- «Mehr» im Studio öffnet ein Sheet mit Mein Profil, Medien, Anfragen, Beiträge, Werbung, Abrechnung, Einstellungen und «Profil pausieren».
- Tippen auf den aktiven Tab scrollt nach oben; ein zweites Tippen führt zur Wurzel des Tabs.
- Im Messenger-Thread, im Story-Viewer und in mehrstufigen Formularen ist die Tab-Leiste ausgeblendet.
- Zurück ist immer oben links und entspricht dem Browser-Zurück. Jede Ansicht hat eine eigene URL.

### 6.5 Tablet (768 bis 1023 px)

Kopfzeile wie Desktop mit Suche als Icon, Navigation in einem Seiten-Sheet. Das Studio zeigt die eingeklappte Seitenleiste (64 px). Nachrichten und Kalender nutzen zwei Spalten.

## 7. Seiteninventar

Die Plattform hat rund 150 Routen in sechs Bereichen. Alle Pfade stehen hinter einem Sprachpräfix (`/de`, `/fr`, `/it`, `/en`) und werden pro Sprache übersetzt; hier stehen die deutschen Pfade ohne Präfix. Phase 1 bis 4 entspricht Abschnitt 17.

### 7.1 Marktplatz (öffentlich, nach Altersprüfung)

| Route | Seite | Phase |
| --- | --- | --- |
| `/` | Entdecken: Suche, Region, Profile der Region, Touren, neue Profile | 1 |
| `/suche` | Suchergebnisse; Filter, Sortierung und Ansicht in der URL | 1 |
| `/profile` | Einzelanbieter (Suche mit Voreinstellung) | 1 |
| `/clubs` | Clubs und Agenturen (Suche mit Voreinstellung) | 1 |
| `/ch`, `/ch/[kanton]`, `/ch/[kanton]/[stadt]` | Regionale Landingpages mit Ergebnissen | 1 |
| `/kategorie/[slug]` | Kategorie-Landingpage | 1 |
| `/p/[name]` | Anbieterprofil, Übersicht | 1 |
| `/p/[name]/medien`, `/bewertungen`, `/beitraege` | Profil-Tabs | 1, 1, 3 |
| `/p/[name]/anfrage` | Terminanfrage (Sheet/Seitenpanel mit eigener URL) | 1 |
| `/c/[slug]` | Club- oder Agenturprofil | 1 |
| `/c/[slug]/team`, `/c/[slug]/standorte/[id]` | Verknüpfte Anbieter, Standort | 1 |
| `/touren` | Aktuelle und kommende Touren nach Region | 3 |
| `/alterspruefung` | Altersprüfung vor beschränkten Inhalten | 1 |

### 7.2 Community

| Route | Seite | Phase |
| --- | --- | --- |
| `/community` | Feed (Neueste, Gefolgt, Region) | 3 |
| `/community/beitrag/[id]` | Beitrag mit Kommentaren | 3 |
| `/community/stories/[id]` | Story-Viewer | 3 |
| `/community/blogs`, `/community/blogs/[slug]` | Blog-Übersicht, Artikel | 3 |
| `/community/events`, `/community/events/[slug]` | Veranstaltungen | 3 |
| `/community/regeln` | Community-Regeln | 3 |
| `/community/forum/*` | Forum (nur Routen reserviert) | 4 |

### 7.3 Information, Recht, System

| Route | Seite | Phase |
| --- | --- | --- |
| `/fuer-anbieter`, `/fuer-clubs`, `/preise` | Angebot für Anbieter und Unternehmen, Tarife | 1, 1, 2 |
| `/sicherheit` | Wie Verifizierung, Meldungen und Schutz funktionieren | 1 |
| `/hilfe`, `/hilfe/[slug]`, `/kontakt` | Hilfe mit Suche, Artikel, Kontakt | 1 |
| `/melden` | Meldung ohne Konto (Missbrauch, Bildrechte, Ausbeutung) | 1 |
| `/recht/agb`, `/datenschutz`, `/impressum`, `/richtlinien` | Rechtstexte | 1 |
| `/ueber-uns` | Über die Plattform | 1 |
| `404`, `500`, `/wartung`, `/offline` | Systemseiten | 1 |

### 7.4 Konto und Anmeldung

| Route | Seite | Phase |
| --- | --- | --- |
| `/anmelden`, `/anmelden/2fa` | Anmeldung, zweiter Faktor, Passkey | 1 |
| `/registrieren`, `/registrieren/bestaetigen` | Kontotyp wählen, E-Mail bestätigen | 1 |
| `/passwort/vergessen`, `/passwort/neu` | Passwort zurücksetzen | 1 |
| `/einladung/[token]` | Einladung in eine Organisation oder Verknüpfung annehmen | 1 |

### 7.5 Mitgliederbereich (angemeldet)

| Route | Seite | Phase |
| --- | --- | --- |
| `/ich` | Übersicht: offene Anfragen, ungelesene Nachrichten, nächste Termine | 1 |
| `/nachrichten`, `/nachrichten/[id]` | Inbox, Unterhaltung | 1 |
| `/termine`, `/termine/[id]` | Anfragen und Termine, Detail mit Verlauf | 1 |
| `/favoriten`, `/favoriten/[sammlung]` | Favoriten und private Sammlungen | 1 |
| `/suchen` | Gespeicherte Suchen | 1 |
| `/bewertungen`, `/bewertungen/neu/[termin]` | Eigene Bewertungen, Bewertung schreiben | 1 |
| `/benachrichtigungen` | Alle Benachrichtigungen | 1 |
| `/einstellungen/profil` | Benutzerprofil, Benutzername | 1 |
| `/einstellungen/sicherheit` | Passwort, 2FA, Passkeys, Sitzungen, Änderungsprotokoll | 1 |
| `/einstellungen/privatsphaere` | Sichtbarkeit, Online-Status, Lesebestätigung, Blockierte | 1 |
| `/einstellungen/benachrichtigungen` | Kanäle und Ereignisse | 1 |
| `/einstellungen/darstellung` | Sprache, hell/dunkel, Bewegung | 1 |
| `/einstellungen/daten` | Export, Deaktivieren, Löschung beantragen | 1 |

### 7.6 Studio für Einzelanbieter

| Route | Seite | Phase |
| --- | --- | --- |
| `/studio` | Heute | 1 |
| `/studio/start`, `/studio/start/[schritt]` | Onboarding: Identität, Regionen, Profil, Medien, Angebot, Verfügbarkeit, Vorschau, Einreichen | 1 |
| `/studio/verifizierung` | Status, Ablaufdatum, erneute Prüfung | 1 |
| `/studio/profil`, `/studio/profil/[abschnitt]` | Basis, Beschreibung, Angebot, Preise, Kontakt, Sichtbarkeit | 1 |
| `/studio/medien`, `/studio/medien/[id]` | Medienbibliothek, Detail mit Zuschnitt und Sichtbarkeit | 1 |
| `/studio/nachrichten`, `/studio/nachrichten/[id]` | Inbox mit Labels | 1 |
| `/studio/nachrichten/vorlagen` | Textvorlagen | 2 |
| `/studio/kalender` | Tag, Woche, Monat | 1 |
| `/studio/kalender/verfuegbarkeit` | Arbeitszeiten, wiederkehrende Fenster, Abwesenheiten, Puffer | 1 |
| `/studio/anfragen`, `/studio/anfragen/[id]` | Terminanfragen nach Status, Detail mit Gegenvorschlag | 1 |
| `/studio/bewertungen` | Erhaltene Bewertungen, Stellungnahme, Einspruch | 1 |
| `/studio/statistik` | Überblick | 1 |
| `/studio/statistik/suche`, `/medien`, `/kontakt` | Detailauswertungen | 2 |
| `/studio/touren`, `/studio/beitraege`, `/studio/beitraege/neu` | Touren, Beiträge und Stories | 3 |
| `/studio/werbung`, `/werbung/neu`, `/werbung/[id]` | Kampagnen, buchen, auswerten | 2 |
| `/studio/abrechnung`, `/abrechnung/tarif`, `/abrechnung/rechnungen` | Tarif, Rechnungen, Zahlungsmittel | 2 |
| `/studio/verknuepfungen` | Verknüpfungen mit Clubs: Einladungen annehmen, lösen | 1 |
| `/studio/einstellungen` | Kontaktwege, Benachrichtigungen, Online-Status | 1 |

### 7.7 Studio für Clubs und Agenturen

Alle Routen unter `/studio/o/[org]`.

| Route | Seite | Phase |
| --- | --- | --- |
| `/` | Heute für die Organisation | 1 |
| `/profil` | Unternehmensprofil | 1 |
| `/nachweise` | Geschäftsidentität, Bewilligungen, Prüfstatus | 1 |
| `/standorte`, `/standorte/[id]` | Standorte mit Öffnungszeiten | 1 |
| `/anbieter` | Verknüpfte Anbieter, Einladungen | 1 |
| `/team`, `/team/einladen` | Mitarbeitende und Berechtigungen | 2 |
| `/medien` | Unternehmensmedien | 1 |
| `/kalender` | Freigegebene Teamtermine | 2 |
| `/angebote` | Unternehmensweite Angebote | 2 |
| `/statistik`, `/werbung`, `/abrechnung` | Auswertung, Kampagnen, Rechnungen | 2 |
| `/einstellungen` | Organisation, Kontakt, Benachrichtigungen | 1 |

### 7.8 Admin (eigene Shell unter `/admin`, nur interne Rollen, 2FA Pflicht)

| Route | Seite | Phase |
| --- | --- | --- |
| `/admin` | Plattformübersicht | 1 |
| `/admin/benutzer`, `/benutzer/[id]` | Benutzer, Rollen, Sperren, Einsprüche | 1 |
| `/admin/anbieter`, `/admin/unternehmen` | Anbieter- und Unternehmensprofile | 1 |
| `/admin/verifizierungen`, `/verifizierungen/[id]` | Prüfwarteschlange, Einzelfall | 1 |
| `/admin/moderation`, `/moderation/[fall]` | Warteschlange, Fall mit Entscheid und Begründung | 1 |
| `/admin/bewertungen`, `/admin/community` | Bewertungen, Beiträge und Kommentare | 1, 3 |
| `/admin/regionen`, `/admin/kategorien` | Regionen mit Freigaberegeln, Dienstleistungskategorien | 1 |
| `/admin/inhalte`, `/admin/seo` | CMS-Seiten, Hilfe, Landingpages, Metadaten | 1 |
| `/admin/support`, `/support/[ticket]` | Supportanfragen | 1 |
| `/admin/produkte`, `/admin/rechnungen`, `/admin/werbung` | Tarife, Rechnungen, Kampagnen | 2 |
| `/admin/system/flags`, `/system/rollen`, `/system/audit`, `/system/status` | Feature Flags, interne Rollen, Audit-Log, Dienststatus | 1 |

## 8. Navigationsbeziehungen

Jede Seite ist von der Shell aus in höchstens drei Schritten erreichbar, und jeder Kernablauf endet dort, wo er begann.

```text
                              +-------------------+
                              |  Altersprüfung    |  (einmal pro Sitzung/Konto)
                              +---------+---------+
                                        v
  Mega-Menü / Regionen ---->  +-------------------+  <---- Landingpages /ch/..., /kategorie/...
                              |  Entdecken  /     |
                              +----+---------+----+
                                   |         |
                      Suche/Filter v         v Touren, Neu, Community-Auszug
                              +---------+   +-----------+
                              | /suche  |   | /community|<--> Beitrag, Story, Blog, Event
                              +----+----+   +-----+-----+
                                   |              |
                                   v              v  (Autor antippen)
   /c/[slug] Club <---------> +-------------------+
   (Team, Standorte)          |  Profil /p/[name] |-- Tabs: Medien | Bewertungen | Beiträge
                              +--+-----+-------+--+
                 Favorit merken  |     |       |  Melden
                     v           |     |       v
               /favoriten        |     |    ReportDialog -> /admin/moderation
                                 |     |
                   Nachricht     v     v  Termin anfragen
                      +--------------+ +----------------------+
                      | /nachrichten |<>| /p/[name]/anfrage    |
                      |   /[id]      | | -> /termine/[id]     |
                      +------+-------+ +----------+-----------+
                             |                    |
   ====== gleiche Unterhaltung, gleicher Termin, Anbieterseite ======
                             v                    v
                 /studio/nachrichten/[id] <-> /studio/anfragen/[id] <-> /studio/kalender
                                                  |
                                 bestätigt -> stattgefunden -> /bewertungen/neu/[termin]
                                                                  -> /studio/bewertungen
```

### 8.1 Wechsel zwischen Marktplatz und Studio

| Von | Aktion | Nach | Art |
| --- | --- | --- | --- |
| Jede Marktplatz-Seite | `ModeSwitch` → Studio | `/studio` (oder zuletzt besuchte Studio-Seite) | Seitenleiste fährt ein |
| Jede Studio-Seite | `ModeSwitch` → Marktplatz | Zuletzt besuchte Marktplatz-Seite | Seitenleiste fährt aus |
| Eigenes Profil `/p/[name]` | «Bearbeiten» in der Eigentümer-Leiste | Seitenpanel mit `/studio/profil/[abschnitt]` | Panel über dem Profil |
| `/studio/profil` | «Im Marktplatz ansehen» | `/p/[name]` mit Eigentümer-Leiste | Navigation |
| `/studio/statistik/suche` | Suchbegriff antippen | `/suche?...` mit eigener Karte markiert | Navigation |
| `/studio/anfragen/[id]` | «Unterhaltung öffnen» | `/studio/nachrichten/[id]` | Zweite Spalte (Desktop), Navigation (Mobile) |
| `/studio/kalender` | Termin antippen | `/studio/anfragen/[id]` | Seitenpanel |
| `/studio/werbung/[id]` | «Platzierung ansehen» | Suche oder Landingpage mit der Anzeige | Navigation |
| Benachrichtigung | Antippen | Zielobjekt im passenden Modus | Modus wechselt automatisch |

### 8.2 Regeln

- **Zugriffsschutz:** Eine geschützte Route führt Unangemeldete zu `/anmelden?weiter=<pfad>` und nach der Anmeldung zurück zum Ziel, mit erhaltenen Eingaben (zum Beispiel einer begonnenen Terminanfrage).
- **Studio ohne Anbieterrolle:** `/studio` führt zu `/fuer-anbieter`. Mit begonnener, nicht veröffentlichter Rolle zu `/studio/start` beim ersten offenen Schritt.
- **Zustand in der URL:** Filter, Sortierung, Ansicht, aktiver Tab, Kalenderdatum und geöffnete Panels stehen in der URL. Zurück schliesst zuerst Panel oder Sheet, dann wechselt es die Seite.
- **Scroll-Position:** Zurück von einem Profil zur Suche stellt Position und geladene Ergebnisse wieder her.
- **Breadcrumbs** ab der zweiten Ebene auf Desktop (`Entdecken / Zürich / Name`); auf Mobile ersetzt der Zurück-Titel sie.
- **Querverweise in beide Richtungen:** Profil ↔ Club, Termin ↔ Unterhaltung, Bewertung ↔ Termin, Kampagne ↔ Platzierung, Beitrag ↔ Autorprofil.
- **Keine Sackgassen:** Leerzustände und Fehlerseiten nennen den nächsten sinnvollen Schritt als Link oder Button.

## 9. Layouts Marktplatz

Die Startseite ist die Suche. Es gibt keine Marketing-Hero-Fläche: Wer ankommt, sieht ein Suchfeld, seine Region und echte Profile.

### 9.1 Entdecken `/`

```text
Desktop (1280)
+----------------------------------------------------------------------------------+
| Kopfzeile                                                                        |
+----------------------------------------------------------------------------------+
|  H1: Profile in Zürich                                   [Region ändern v]       |
|  [ Ort oder Name          ] [ Wann: Heute v ] [ Kategorie v ] [Suchen]           |
|  Chips: Heute verfügbar | Identität geprüft | Neu | Mit Bewertungen | Auf Tour   |
|                                                                                  |
|  H2: Heute verfügbar                                        Alle ansehen >       |
|  +--------+ +--------+ +--------+ +--------+ +--------+                          |
|  | 4:5    | | 4:5    | | 4:5    | | 4:5    | | 4:5    |   ProfileCard (Raster)   |
|  | Foto   | | Foto   | | Foto   | | Foto   | | Foto   |                          |
|  +--------+ +--------+ +--------+ +--------+ +--------+                          |
|  Name       Name  Anzeige                                                        |
|  Ort · Signale                                                                   |
|                                                                                  |
|  H2: Auf Tour in deiner Region        (TourCard-Liste, 3 Spalten)                |
|  H2: Neu dabei                        (ProfileCard-Reihe)                        |
|  H2: Clubs in der Nähe                (kompakte Liste, 2 Spalten)                |
|  H2: Aus der Community                (3 Beiträge, ab Phase 3)                   |
|  Regionen: Zürich · Bern · Basel · Genf · ... (Linkliste, kein Bildraster)       |
+----------------------------------------------------------------------------------+

Mobile (375)
+--------------------------------+
| (Glas) Zürich v        Suche   |
| H1 Profile in Zürich           |
| [ Ort oder Name            ]   |
| Chips > Heute | Geprüft | Neu  |  horizontal scrollbar, Glas beim Anheften
| H2 Heute verfügbar      Alle > |
| +------------+ +------------+  |
| | Foto 4:5   | | Foto 4:5   |  |  2 Spalten
| +------------+ +------------+  |
| Name           Name            |
| Ort · Signal   Ort · Signal    |
| H2 Auf Tour             Alle > |  horizontale Reihe
| H2 Neu dabei                   |
|  [ o    o    o    o    o ]     |  GlassTabBar
+--------------------------------+
```

- Die Region stammt aus der letzten Wahl oder der gespeicherten Einstellung. Der Standort des Geräts wird nur nach ausdrücklichem Tippen auf «In meiner Nähe» abgefragt.
- Jede Reihe zeigt höchstens eine bezahlte Platzierung, mit dem Wort «Anzeige» neben dem Namen.
- Eine Reihe ohne Einträge wird weggelassen. Hat die Region gar keine Profile, erscheint ein Leerzustand mit den nächsten Regionen.

### 9.2 Suche `/suche`

```text
Desktop (1280)
+----------------------------------------------------------------------------------+
| Kopfzeile (Suchfeld enthält die Anfrage)                                         |
+--------------------+-------------------------------------------------------------+
| FilterPanel 280    | H1: 48 Profile in Zürich                                    |
|                    | Aktive Filter: [Heute x] [Deutsch x]   Alle zurücksetzen    |
| Standort           | Sortierung: Relevanz v     Ansicht: [Raster|Liste]          |
|  Kanton v          | [Suche speichern]                                           |
|  Stadt v           |-------------------------------------------------------------|
|  Umkreis ---o--    | +-------+ +-------+ +-------+ +-------+                     |
| Verfügbarkeit      | | Foto  | | Foto  | | Foto  | | Foto  |                     |
|  ( ) Jetzt         | +-------+ +-------+ +-------+ +-------+                     |
|  ( ) Heute         | Name   ♡  Name Anzeige ...                                  |
|  ( ) Datum wählen  | Zürich · Identität geprüft · Heute verfügbar                |
| Profil             | ab CHF ... / Std.                                           |
|  Typ, Alter, Sprache                                                             |
| Angebot            |              ... 24 pro Seite ...                           |
|  Kategorien (Suche)|                                                             |
|  Preis  o-----o    |           [ Weitere 24 laden ]   1-24 von 48                |
| Vertrauen          |                                                             |
|  [ ] Identität geprüft                                                           |
|  [ ] Fotos geprüft |                                                             |
|  [ ] Mit Bewertungen                                                             |
| Inhalte            |                                                             |
|  [ ] Mit Video ... |                                                             |
+--------------------+-------------------------------------------------------------+

Mobile (375)
+--------------------------------+
| (Glas) <  Zürich, heute   Suche|
| (Glas) [Filter 2] Heute | Preis|  Chip-Leiste, haftet oben
| 48 Profile · Relevanz v        |
| +------------+ +------------+  |
| | Foto       | | Foto       |  |
| +------------+ +------------+  |
| ...                            |
|                      (Glas)    |
|                 [Raster|Liste] |
|  [ o    o    o    o    o ]     |
+--------------------------------+

FilterSheet (Mobile, volle Höhe, deckend)
+--------------------------------+
|  ---                           |
|  Filter              Zurücksetzen
|  Standort                    > |
|  Verfügbarkeit               > |
|  Profil                      > |
|  Angebot                     > |
|  Vertrauen                   > |
|  Inhalte                     > |
|  [  48 Profile anzeigen     ]  |  Zahl aktualisiert sich live
+--------------------------------+
```

**Verhalten der Suche**

- Filter wirken auf Desktop sofort; die Ergebniszahl wird per Live-Region angesagt. Auf Mobile wirken sie beim Schliessen des Sheets über den Button mit der Trefferzahl.
- Jeder aktive Filter erscheint als entfernbarer Chip. «Alle zurücksetzen» stellt den Ausgangszustand her.
- Keine Treffer: Der Leerzustand nennt, welcher Filter am stärksten einschränkt, und bietet an, genau diesen zu entfernen.
- Sortierung: Relevanz, Kürzlich aktualisiert, Neu, Preis. Keine Sortierung nach «Beliebtheit».
- Bezahlte Platzierungen stehen an festen Positionen (zum Beispiel 1 und 9), tragen «Anzeige» und zählen nicht zur Trefferzahl.
- Listenansicht: Foto 96 px links, daneben Name, Region, Signale, Sprachen, Preis ab, nächste Verfügbarkeit. Gedacht für Vergleiche.
- «Weitere laden» statt endlosem Scrollen; die Seitenzahl steht in der URL, der Footer bleibt erreichbar.
- Die URL enthält nie private Daten. Der Umkreis bezieht sich auf einen Ortsmittelpunkt, nie auf eine Adresse.

### 9.3 ProfileCard

```text
+------------------+
|                  |
|    Foto 4:5      |   Radius 16, kein Text auf dem Bild
|              ♡   |   Favorit: einziges Element auf dem Foto
+------------------+
 Name          Anzeige     H3, eine Zeile; «Anzeige» nur bei bezahlter Platzierung
 Zürich · Kreis 4          Region so allgemein, wie der Anbieter sie freigibt
 ✓ Identität geprüft       höchstens 2 Signale, Icon + Wort, neutral
 ● Heute verfügbar         nur wenn vom Kalender gedeckt
```

Die ganze Karte ist ein Link zum Profil; Favorit ist ein eigener Button mit eigenem Namen («Name als Favorit speichern»). Kein Online-Punkt, wenn der Anbieter den Status verbirgt. Keine Sterne-Durchschnitte auf der Karte.

### 9.4 Clubprofil `/c/[slug]`

Gleicher Aufbau wie das Anbieterprofil (Abschnitt 10) mit anderen Abschnitten: Über uns, Standorte mit Öffnungszeiten, verknüpfte Anbieter als ProfileCard-Raster, Galerie, Kontakt. Verknüpfte Anbieter erscheinen nur nach ihrer Zustimmung.

## 10. Layouts Profilseite `/p/[name]`

Das Profil beantwortet in dieser Reihenfolge: Wer ist das, kann ich der Angabe trauen, wann und wo, was kostet es, wie nehme ich Kontakt auf. Die Kontaktaktionen bleiben beim Scrollen sichtbar.

```text
Desktop (1280)
+----------------------------------------------------------------------------------+
| Kopfzeile                                                                        |
| [Eigentümer-Leiste: So sehen Besucher dein Profil   Bearbeiten  Statistik]  (nur Inhaber)
+----------------------------------------------------------------------------------+
| Entdecken / Zürich / Name                                                        |
| +----------------------------------------------+ +-----------------------------+ |
| |                                              | | H1 Name                     | |
| |   MediaGallery: 1 grosses Bild 4:5           | | Zürich · spricht DE, EN, FR | |
| |   + 4 Vorschauen, «Alle 18 Medien»           | |                             | |
| |                                              | | TrustSignals                | |
| +----------------------------------------------+ | ✓ Identität geprüft  (i)    | |
|                                                  | ✓ Fotos geprüft      (i)    | |
| Tabs: Übersicht | Medien | Bewertungen | Beiträge| Aktualisiert vor 3 Tagen    | |
| ------------------------------------------------ |                             | |
| H2 Über mich                                     | Verfügbarkeit               | |
| Fliesstext, max. 68 Zeichen breit                | Heute 14-22 Uhr             | |
|                                                  | [Woche ansehen]             | |
| H2 Angebot                                       |                             | |
| ServiceList (Kategorien als ruhige Liste)        | [ Termin anfragen ]  primär | |
|                                                  | [ Nachricht schreiben ]     | |
| H2 Preise                                        | ♡ Speichern    Teilen       | |
| RateTable: Dauer | Preis | Hinweis               |                             | |
| Stand: 02.11.2026                                | Melden                      | |
|                                                  +-----------------------------+ |
| H2 Verfügbarkeit diese Woche                       ContactBar, haftet (sticky)   |
| Mo Di Mi Do Fr Sa So  (Zeitfenster als Balken)                                   |
|                                                                                  |
| H2 Auf Tour                                                                      |
| Bern, 12.-14. Nov. · Genf, 20.-22. Nov.                                          |
|                                                                                  |
| H2 Verknüpft mit                                                                 |
| Club-Name, Zürich  >                                                             |
|                                                                                  |
| H2 Bewertungen (12)                   Alle ansehen >                             |
| ReviewItem × 3: Datum · «Nach bestätigtem Termin» · Kategorien · Text            |
|                                                                                  |
| H2 Ähnliche Profile in Zürich   (ProfileCard-Reihe, ohne Anzeigen)               |
+----------------------------------------------------------------------------------+

Mobile (375)
+--------------------------------+
| (Glas) <              ♡  Teilen|   schwebt über dem Foto
| +----------------------------+ |
| |                            | |
| |   Foto 4:5, wischbar       | |
| |              1 / 18        | |
| +----------------------------+ |
| H1 Name                        |
| Zürich · DE, EN, FR            |
| ✓ Identität geprüft · ✓ Fotos  |   Antippen öffnet Erklärung als Sheet
| ● Heute 14-22 Uhr              |
| Tabs (haften): Übersicht Medien Bewertungen
| H2 Über mich                   |
| ... Mehr anzeigen              |
| H2 Angebot                     |
| H2 Preise                      |
| H2 Verfügbarkeit               |
| H2 Bewertungen                 |
| Melden                         |
| +----------------------------+ |
| | (Glas) Nachricht | Termin  | |   ContactBar ersetzt die Tab-Leiste
| +----------------------------+ |
+--------------------------------+
```

### 10.1 Regeln

- **Vertrauenssignale** stehen getrennt untereinander, jedes mit Info-Symbol. Die Erklärung sagt, was geprüft wurde, wann, und was das Signal *nicht* aussagt. Kein Sammelabzeichen, kein «Premium»-Signal in diesem Block.
- **Tarif-Kennzeichen** (Pro) erscheinen nirgends auf dem öffentlichen Profil.
- **Medien:** Die Lightbox ist tastaturbedienbar (Pfeile, Escape), jedes Bild hat einen vom Anbieter gepflegten oder neutralen Alternativtext. Geschützte Medien zeigen eine neutrale Fläche mit der Bedingung («Für angemeldete Mitglieder»), kein unscharfes Vorschaubild.
- **Preise** sind eine echte Tabelle mit Änderungsdatum. Fehlen sie, steht dort «Preise auf Anfrage», nicht eine leere Tabelle.
- **Verfügbarkeit** kommt aus dem Kalender. Ohne gepflegten Kalender erscheint der Abschnitt nicht.
- **Bewertungen** zeigen Datum, Verifikationsart und Kategorien. Keine Sternesumme im Kopf des Profils. Die Stellungnahme des Anbieters steht direkt unter der Bewertung.
- **Kontakt:** «Termin anfragen» öffnet auf Desktop ein Seitenpanel, auf Mobile ein Sheet, jeweils unter `/p/[name]/anfrage`. Unangemeldete sehen das Formular, füllen es aus und melden sich erst beim Senden an; die Eingaben bleiben erhalten.
- **Pausiertes Profil:** Die Seite bleibt für Favoriten erreichbar und zeigt «Dieses Profil ist zurzeit pausiert», ohne Kontaktaktionen. Gesperrte und archivierte Profile antworten mit 404.
- **Melden** ist auf jedem Profil, jedem Medium, jeder Bewertung und jeder Nachricht erreichbar und braucht höchstens zwei Schritte.
- **SEO:** Server-gerendert, sprechende URL, Canonical, `noindex` für pausierte Profile und alle Tabs ausser der Übersicht.

### 10.2 Terminanfrage (Panel oder Sheet)

```text
+----------------------------------+
| Termin anfragen bei Name      x  |
| Unverbindlich. Name entscheidet  |
| frei, ob sie zusagt.             |
|                                  |
| Tag        [ Do, 19.11.2026  v ] |  nur Tage mit Verfügbarkeit wählbar
| Uhrzeit    [ 18:00 v ]           |  Fenster aus dem Kalender
| Dauer      [ 1 Std. v ]          |
| Region     [ Zürich v ]          |
| Nachricht  [                   ] |
|            Was Name wissen sollte|
|                                  |
| [ Anfrage senden ]   Abbrechen   |
+----------------------------------+
```

Nach dem Senden wechselt das Panel in den Zustand «Anfrage gesendet» mit Link zu `/termine/[id]` und zur Unterhaltung. Die Anfrage erscheint sofort in beiden Inboxen.

## 11. Layouts Anbieter-Studio

Das Studio ist ein Arbeitswerkzeug, kein Berichtswesen. Jede Ansicht beginnt mit dem, was jetzt zu tun ist. Kennzahlen stehen darunter und immer mit Vergleichswert.

### 11.1 Heute `/studio`

```text
Desktop (1280)
+------------------+---------------------------------------------------------------+
| Seitenleiste     | H1 Heute, Montag 16. November          Profil: Online  [Pausieren]
|                  |---------------------------------------------------------------|
|                  | +-------------------------------------+ +-------------------+ |
|                  | | H2 Zu erledigen                     | | H2 Heute          | |
|                  | | 2 Terminanfragen warten auf Antwort | | 14:00 Verfügbar   | |
|                  | |   Anfrage für Do 18:00   [Ansehen]  | | 18:00 Termin      | |
|                  | |   Anfrage für Sa 20:00   [Ansehen]  | |       bestätigt   | |
|                  | | 3 ungelesene Nachrichten [Öffnen]   | | 22:00 Ende        | |
|                  | | Verifizierung läuft in 21 Tagen ab  | | [Kalender öffnen] | |
|                  | |                          [Erneuern] | |                   | |
|                  | | 1 Foto zur Korrektur zurückgegeben  | |                   | |
|                  | +-------------------------------------+ +-------------------+ |
|                  |                                                               |
|                  | H2 Letzte 7 Tage                    Zeitraum: [7 Tage v]      |
|                  | Profilaufrufe   Kontaktanfragen   Terminanfragen   Favoriten  |
|                  | 412             18                7                +9         |
|                  | +12 % ggü. Vorwoche  -2            +3              +4         |
|                  | ___/\__/\___  (eine Linie: Profilaufrufe pro Tag)             |
|                  |                                           Zur Statistik >     |
|                  |                                                               |
|                  | H2 Dein Profil                                                |
|                  | Vollständig zu 80 %: Preise fehlen  [Preise ergänzen]         |
|                  | Im Marktplatz ansehen >                                       |
+------------------+---------------------------------------------------------------+

Mobile (375)
+--------------------------------+
| (Glas) Heute            Bell   |
|  [Marktplatz|Studio]           |
| Profil: Online    [Pausieren]  |
| H2 Zu erledigen                |
|  2 Terminanfragen            > |
|  3 ungelesene Nachrichten    > |
|  Verifizierung erneuern      > |
| H2 Heute                       |
|  18:00 Termin bestätigt      > |
| H2 Letzte 7 Tage               |
|  412 Profilaufrufe  +12 %      |
|  18 Kontaktanfragen  -2        |
|  Zur Statistik >               |
|  [ Heute Kal. Nachr. Stat. Mehr ]
+--------------------------------+
```

- «Zu erledigen» ist nach Dringlichkeit sortiert: Sicherheits- und Verifizierungshinweise, ablaufende Anfragen, Nachrichten, Korrekturen. Ist nichts offen, steht dort ein Satz («Nichts offen»), keine Illustration.
- Höchstens vier Kennzahlen, jede mit Vergleich zur Vorperiode in Zahl und Wort, nie nur als farbiger Pfeil.
- Der Profilstatus mit «Pausieren» steht auf jeder Studio-Seite an derselben Stelle.

### 11.2 Mein Profil `/studio/profil`

```text
Desktop
+------------------+-------------------------------+-------------------------------+
| Seitenleiste     | H1 Mein Profil                | Vorschau                      |
|                  | Status: Veröffentlicht        | [Mobile | Desktop]            |
|                  | Abschnitte                    | +---------------------------+ |
|                  |  Basis                 ✓      | |                           | |
|                  |  Beschreibung          ✓      | |  Live-Vorschau des        | |
|                  |  Angebot               ✓      | |  öffentlichen Profils     | |
|                  |  Preise         fehlt         | |  (gleiche Komponenten     | |
|                  |  Kontakt               ✓      | |   wie /p/[name])          | |
|                  |  Sichtbarkeit          ✓      | |                           | |
|                  | ----------------------------- | +---------------------------+ |
|                  | Formular des gewählten        | Im Marktplatz ansehen >       |
|                  | Abschnitts                    |                               |
|                  | [Änderungen speichern]        |                               |
+------------------+-------------------------------+-------------------------------+
```

- Die Vorschau rendert dieselben Komponenten wie das öffentliche Profil mit den noch ungespeicherten Werten. Es gibt keinen zweiten, nachgebauten Profil-Renderer.
- Speichern pro Abschnitt. Änderungen mit Prüfpflicht (Name, Kontaktwege, Identitätsbezug) zeigen vor dem Speichern: «Diese Änderung wird geprüft, bevor sie sichtbar ist. Dein bisheriges Profil bleibt solange online.»
- Ungespeicherte Änderungen werden beim Verlassen abgefragt und lokal zwischengespeichert.
- Mobile: Abschnittsliste als erste Ebene, Formular als zweite, Vorschau als eigener Button in der Top-Leiste.

### 11.3 Medien `/studio/medien`

Raster mit Drag-and-drop-Reihenfolge und Mehrfachauswahl; für die Tastatur «Nach vorne» und «Nach hinten» als Menüaktionen. Jedes Medium zeigt seinen Status als Wort (In Prüfung, Veröffentlicht, Zur Korrektur, Gesperrt) und seine Sichtbarkeit (Öffentlich, Mitglieder). Der Upload zeigt Fortschritt pro Datei, läuft im Hintergrund weiter und meldet Fehler pro Datei mit Grund und «Erneut versuchen». EXIF- und GPS-Daten werden serverseitig entfernt; die Oberfläche sagt das einmal, beim ersten Upload.

### 11.4 Nachrichten `/studio/nachrichten`

```text
Desktop (drei Spalten)
+------------------+----------------------+--------------------------+---------------+
| Seitenleiste     | Alle | Ungelesen | ★ | Name            ⋯        | Kontext       |
|                  | [Suche in Chats    ] | ------------------------ | Mitglied seit |
|                  | Label: Alle v        |  Nachricht               | 2026          |
|                  | -------------------- |          Antwort         | Labels:       |
|                  | Name        14:02  ● |  Nachricht               | [Termin offen]|
|                  | Vorschau der letzten |                          | Anfragen:     |
|                  | [Termin offen]       | +----------------------+ | Do 18:00      |
|                  | Name        Gestern  | | BookingRequestCard   | | [Ansehen]     |
|                  | ...                  | | Do 19.11., 18:00     | | Private Notiz |
|                  |                      | | [Zusagen] [Gegenvor- | | [           ] |
|                  |                      | |  schlag] [Ablehnen]  | | Blockieren    |
|                  |                      | +----------------------+ | Melden        |
|                  |                      | [Vorlage v] [Nachricht ] |               |
+------------------+----------------------+--------------------------+---------------+

Mobile: Liste -> Thread (Vollbild, Tab-Leiste aus, Composer aus Glas) -> Kontext als Sheet
```

- Terminanfragen erscheinen als Karte im Thread und lassen sich dort beantworten. Thread und Anfrage sind zwei Ansichten desselben Vorgangs.
- Labels sind privat und frei benennbar; Standard sind «Neue Anfrage», «Termin offen», «Bestätigt», «Rückmeldung nötig».
- Vorlagen werden gewählt und landen editierbar im Composer. Nichts wird automatisch gesendet.
- Blockieren wirkt sofort und ohne Mitteilung an die Gegenseite. Melden hängt die betroffene Nachricht an den Fall.
- Nachrichten erscheinen optimistisch mit Zustellstatus (Wird gesendet, Gesendet, Gelesen falls erlaubt, Fehlgeschlagen mit «Erneut senden»).
- Die mittlere und rechte Spalte gibt es auch im Mitgliederbereich unter `/nachrichten`, dort ohne Labels, Vorlagen und Notizen.

### 11.5 Kalender und Anfragen

```text
Desktop /studio/kalender
+------------------+---------------------------------------------------------------+
| Seitenleiste     | H1 Kalender   < Heute >  16.-22. Nov.   [Tag|Woche|Monat]     |
|                  |               [Verfügbarkeit bearbeiten]  [+ Blocker]         |
|                  |---------------------------------------------------------------|
|                  |       Mo 16   Di 17   Mi 18   Do 19   Fr 20   Sa 21   So 22   |
|                  | 12:00                                                         |
|                  | 14:00 [verfügbar ----------------------]                      |
|                  | 16:00                         [Anfrage?]                      |
|                  | 18:00 [Termin]                [18:00    ]      [Blocker]      |
|                  | 20:00                                                         |
+------------------+---------------------------------------------------------------+
Legende: verfügbar = Fläche gedämpft | Anfrage = gestrichelter Rand | bestätigt = Akzentfläche
         Blocker = schraffiert. Jeder Eintrag trägt seinen Status zusätzlich als Wort.
```

- Mobile zeigt standardmässig die Tagesansicht mit Wochenstreifen oben; Monat als Übersicht mit Punkten.
- Ein Klick auf einen Eintrag öffnet das Seitenpanel der Anfrage mit Verlauf, Unterhaltung und Aktionen.
- `/studio/anfragen` ist dieselbe Datenmenge als Liste mit Tabs nach Status: Offen, In Abstimmung, Bestätigt, Vergangen. Offene Anfragen zeigen ihre Ablaufzeit.
- Statuswechsel folgen dem Modell aus v1.0 (Angefragt, In Abstimmung, Bestätigt, Abgelehnt, Abgesagt, Abgelaufen, Stattgefunden, Strittig). Jeder Wechsel wird als Ereignis gespeichert und im Verlauf gezeigt.
- Absagen ist für beide Seiten jederzeit möglich, mit optionalem Grund und ohne Sperre. «Aus Sicherheitsgründen absagen» ist eine eigene Option und bietet direkt das Melden an.
- Zeiten werden in der Zeitzone des Anbieters gespeichert und angezeigt; weicht die Zone des Betrachters ab, steht sie dabei.

### 11.6 Statistik `/studio/statistik`

Eine Seite, von oben nach unten: Zeitraumwahl (7, 30, 90 Tage, eigener Zeitraum) mit Vergleich zur Vorperiode; der Trichter Einblendungen in der Suche → Profilaufrufe → Kontaktaktionen → Terminanfragen → bestätigte Termine als horizontale Balken mit Quoten; eine Linie Profilaufrufe pro Tag; darunter Tabellen «Suchen, in denen du erschienst» und «Medien nach Aufrufen». Jede Grafik hat eine Tabellenansicht derselben Daten, einen Leerzustand («Noch keine Daten für diesen Zeitraum») und eine Fussnote, wie die Zahl gezählt wird. Es werden nie einzelne Besucher gezeigt.

### 11.7 Werbung und Abrechnung (Phase 2)

Kampagne buchen ist ein vierstufiger Ablauf: Platzierung wählen (Region, Kategorie) → Zeitraum und Budget → Vorschau der Anzeige an ihrem Ort, mit sichtbarem «Anzeige»-Hinweis → Zusammenfassung und Bezahlen. Die Auswertung zeigt Kosten, Laufzeit, Impressionen, Klicks, Klickrate und zugeordnete Profilbesuche. Die Tarifseite vergleicht Basic und Pro in einer Tabelle und sagt ausdrücklich: «Ein Tarif ändert weder deine Verifizierung noch deine Position in der organischen Suche.»

### 11.8 Onboarding `/studio/start`

Acht Schritte mit sichtbarem Fortschritt (`ProgressSteps`): Identität prüfen → Regionen wählen → Profil → Medien → Angebot und Preise → Verfügbarkeit → Vorschau → Einreichen. Jeder Schritt speichert beim Verlassen, lässt sich später fortsetzen und nennt seine Dauer («etwa 3 Minuten»). Die Identitätsprüfung läuft beim Dienstleister; die Plattform zeigt nur Status und Ergebnis. Nach dem Einreichen zeigt `/studio` den Prüfstatus und die übliche Bearbeitungszeit. Eine Rückgabe zur Korrektur nennt den Grund pro Feld und führt direkt dorthin.

## 12. Mitgliederbereich, Business, Community, Admin

### 12.1 Mitgliederbereich

Der Mitgliederbereich hat keine eigene Seitenleiste. Er liegt im Marktplatz-Modus hinter dem Avatar-Menü (Desktop) und dem Tab «Ich» (Mobile).

- `/ich` zeigt drei Listen: offene Anfragen, ungelesene Unterhaltungen, nächste Termine. Darunter Kurzlinks zu Favoriten, gespeicherten Suchen, Bewertungen, Einstellungen.
- `/favoriten` ist ein ProfileCard-Raster mit Sammlungen als Tabs. «In Sammlung verschieben» geht per Menü und per Mehrfachauswahl. Sammlungen sind privat; es gibt keinen Teilen-Button.
- `/termine` ist eine Liste mit Tabs Offen, Bestätigt, Vergangen. Nach «Stattgefunden» erscheint «Bewertung schreiben».
- `/einstellungen` ist auf Desktop zweispaltig (Abschnitte links, Formular rechts), auf Mobile zweistufig. Jeder Abschnitt speichert für sich.
- Die Bewertung fragt vier Kategorien (Kommunikation, Zuverlässigkeit der Profilangaben, Organisation, Gesamteindruck) und einen freien Text. Ein Hinweis über dem Textfeld nennt, was nicht hineingehört (intime Details, Angaben, die jemanden identifizieren).

### 12.2 Studio für Clubs und Agenturen

Gleiche Shell und gleiche Muster wie das Einzelanbieter-Studio. Die Seitenleiste zeigt: Heute, Unternehmensprofil, Standorte, Anbieter, Team, Medien, Kalender, Angebote, Statistik, Werbung, Abrechnung, Nachweise, Einstellungen.

- **Anbieter:** Tabelle mit Name, Standort, Status der Verknüpfung (Eingeladen, Aktiv, Gelöst) und «Einladen». Die Tabelle zeigt nur öffentliche Profilangaben. Es gibt keinen Zugang zu Nachrichten, Ausweisdaten oder privaten Kalendern der Anbieter.
- **Team:** Tabelle mit Rolle pro Person (Inhaber, Standortmanager, Marketing, Redaktion, Terminorganisation) und einer Rechte-Matrix pro Rolle. Jede Rechteänderung landet im Audit-Log.
- **Kalender:** zeigt nur Termine, die ein Anbieter ausdrücklich für die Organisation freigegeben hat.
- **Standorte:** Liste, Detail mit Öffnungszeiten-Editor (Wochentage, Ausnahmen) und zugeordneten Anbietern.

### 12.3 Community (Phase 3)

```text
Desktop /community
+--------------------+--------------------------------------+----------------------+
| Neueste            | Stories: o o o o o  (StoryRing-Reihe)| Touren diese Woche   |
| Gefolgt            | [ Beitrag schreiben ... ]            | Veranstaltungen      |
| Meine Region       | PostCard                             | Regeln               |
| ------------------ |  Autor · Zeit · Region               |                      |
| Blogs              |  Text, Bild                          |                      |
| Veranstaltungen    |  Kommentare · Speichern · Melden     |                      |
| Touren             | PostCard  (Anzeige, beschriftet)     |                      |
+--------------------+--------------------------------------+----------------------+
Mobile: eine Spalte; Stories oben; Umschalter Neueste | Gefolgt | Region als Glas-Chips
```

- Der Feed ist chronologisch. Es gibt keinen Empfehlungsalgorithmus und kein endloses Autoplay; Videos starten nur nach Antippen, wenn der Nutzer es so einstellt.
- Es gibt keine öffentlichen Like-Zähler. Reaktionen sind «Speichern» und «Kommentieren».
- Stories laufen nach 24 Stunden ab (konfigurierbar). Der Viewer ist tastaturbedienbar, pausiert beim Halten und zeigt immer «Melden».
- Jeder Beitrag durchläuft die Medienmoderation, bevor er sichtbar wird. Der Autor sieht den Status am Beitrag.
- Die Community ist ein eigenes Modul hinter einem Feature Flag und lässt sich pro Region abschalten.

### 12.4 Admin

Die Admin-Anwendung nutzt dieselben Tokens und Komponenten, aber eine eigene, dichte Shell für den Desktop: feste Seitenleiste, Tabellen mit 40 px Zeilenhöhe, kein Glas. Sie ist ab 1024 px voll nutzbar und darunter nur lesend.

```text
/admin/moderation/[fall]
+----------------+---------------------------------------+-------------------------+
| Übersicht      | Fall M-2026-00412 · Medien · Hoch     | Entscheid               |
| Benutzer       | Status: In Prüfung · Zuständig: ...   | ( ) Freigeben           |
| Anbieter       |---------------------------------------| ( ) Zur Korrektur       |
| Unternehmen    | Gemeldeter Inhalt (Vorschau, mit      | ( ) Entfernen           |
| Verifizierungen|  Schutz vor versehentlicher Anzeige)  | ( ) Konto einschränken  |
| Moderation  14 | Meldegrund und Text der Meldung       | Begründung (Pflicht)    |
| ...            | Verlauf des Kontos (frühere Fälle)    | [                    ]  |
|                | Automatische Hinweise (nur Hinweis)   | Regel: [auswählen v]    |
|                |                                       | [Entscheid speichern]   |
+----------------+---------------------------------------+-------------------------+
```

- Jeder Entscheid braucht Begründung und Regelbezug, wird protokolliert und ist über einen Einspruch anfechtbar. Automatische Erkennung markiert nur.
- Sensible Daten (Verifizierungsdetails, private Nachrichten in Meldefällen) sind standardmässig verdeckt. Das Aufdecken verlangt einen Grund und erzeugt einen Audit-Eintrag.
- Warteschlangen sind Tabellen mit Filter, Sortierung nach Priorität und Alter, Zuweisung und Tastaturkürzeln für «Nächster Fall».
- Verdacht auf Minderjährigkeit, Zwang oder Menschenhandel hat eine eigene Kategorie mit höchster Priorität, sofortiger Sperre des Inhalts und dokumentiertem Eskalationsweg an Trust & Safety.
  - **Ergänzt am 18.11.2026 (Entscheid der Betreiberin, Entscheid 0020):**
    - Jede solche Meldung wird sofort an Trust & Safety eskaliert.
    - Den Inhalt sperrt sie sofort nur, wenn das meldende Konto seine E-Mail bestätigt hat, mindestens 7 Tage alt ist und in den letzten 24 Stunden höchstens 3 Sofortsperren ausgelöst hat.
    - Meldungen ohne Konto (`/melden`) sperren nie automatisch.
    - So lässt sich kein Profil mit falschen Meldungen aus der Öffentlichkeit nehmen.

## 13. Zustände und UX-Verhalten

Jeder Container (Seite, Liste, Tabelle, Formular, Dialog, Panel) implementiert vier Zustände: **lädt, leer, bereit, Fehler**. Wo Schaden möglich ist, kommt **Warnung** hinzu. Ziel ist WCAG 2.2 AA.

| Bereich | Regel |
| --- | --- |
| Laden | Skelett in der Form des Inhalts nach 150 ms. Kein Spinner über Flächen. Dauert es länger als 8 Sekunden, erscheint ein Satz mit «Erneut versuchen». |
| Leer | Ein Satz, was hier stehen wird, und die eine Aktion, die es füllt. «Keine Treffer» unterscheidet sich von «noch nichts angelegt». |
| Fehler | Sagt, was passiert ist, was erhalten blieb und was jetzt geht. Eingaben gehen nie verloren. Kein Fehlercode ohne Klartext. |
| Formulare | Label über dem Feld, Format-Hinweis darunter. Prüfung beim Verlassen des Felds, nicht beim Tippen. Fehler am Feld und zusammengefasst oben mit Sprunglinks; der Fokus geht zum ersten Fehler. Der Senden-Button ist nie deaktiviert, sondern erklärt, was fehlt. Pflicht ist der Normalfall; optionale Felder sind als «optional» beschriftet. |
| Speichern | Einstellungen mit Schaltern speichern sofort mit Bestätigung am Ort. Formulare haben einen Speichern-Button. Beides wird nicht in einem Formular gemischt. |
| Destruktive Aktionen | Umkehrbares (archivieren, pausieren, aus Sammlung entfernen) geschieht sofort mit «Rückgängig» im Toast (8 Sekunden). Nicht Umkehrbares (Konto löschen, Medium endgültig löschen, Verknüpfung lösen) verlangt einen Dialog, der die Folge benennt, mit Button «Medium löschen», nie «OK» oder «Sind Sie sicher?». |
| Dialoge und Panels | Dialog für kurze Entscheidungen, Seitenpanel für Bearbeiten im Kontext, eigene Seite für mehr als etwa sieben Felder. Fokus wird gefangen und kehrt zum Auslöser zurück. Escape schliesst, bei ungespeicherten Eingaben mit Rückfrage. Keine Dialoge in Dialogen. |
| Tabellen | Kopfzeile haftet, Sortierung und Filter in der URL, Mehrfachauswahl mit Sammelaktionen, Zeilenaktionen im Menü. Unter 768 px wird jede Zeile zur Karte mit den zwei bis drei wichtigsten Feldern. Kein horizontales Scrollen. |
| Tabs | Der aktive Tab steht in der URL. Ein Tabwechsel verliert keine Eingaben. Passen Tabs nicht, scrollen sie horizontal mit sichtbarem Anschnitt. |
| Datum und Zeit | Schweizer Format `TT.MM.JJJJ` und 24 Stunden, Wochenbeginn Montag, Eingabe per Tastatur und Kalender. Nicht wählbare Tage sind erklärt. Relative Angaben («vor 3 Tagen») haben das genaue Datum im Tooltip. |
| Rückmeldung | Erfolg als Toast, Probleme am Ort ihres Entstehens. Statusmeldungen laufen über Live-Regionen. Verbindungsverlust zeigt ein Banner; ungesendete Nachrichten bleiben im Composer. |
| Echtzeit | Neue Nachrichten und Statusänderungen erscheinen ohne Neuladen. Verändert jemand anderes dasselbe Objekt, wird der neue Stand gezeigt, bevor überschrieben wird. |
| Berechtigung | Fehlt ein Recht, ist die Aktion sichtbar und erklärt («Nur der Inhaber kann Standorte löschen») oder ganz weg. Nie ein Klick, der mit 403 endet. |
| Tastatur und Screenreader | Alles ist ohne Maus bedienbar. Fokus ist sichtbar (2 px Akzent, 2 px Abstand). Skip-Link zum Inhalt. Jedes Icon ohne Text hat einen Namen. Überschriften bilden eine lückenlose Hierarchie. |
| Zoom und Breite | Bei 200 % Zoom und bei 320 px Breite bleibt alles bedienbar und ohne horizontales Scrollen. |
| Sprache | Du-Form, Satzschreibung, keine Ausrufezeichen. Buttons sind Verb + Objekt. Ein Begriff pro Sache: «Terminanfrage», «Anbieter», «Studio», «Anzeige». Dasselbe Wort steht nicht zweimal nebeneinander. |
| Diskretion | Benachrichtigungen auf dem Sperrbildschirm und E-Mail-Betreffs nennen weder Namen noch Inhalt («Du hast eine neue Nachricht»). Der Seitentitel im Browser-Tab ist neutral einstellbar. |
| Hilfe | Jeder Ablauf verlinkt an seinem Start den passenden Hilfeartikel. Blockierte Aktionen sagen, warum, und wie es weitergeht. |

## 14. Technische Architektur und Railway

Die Plattform ist ein modularer Monolith in einem Monorepo mit drei Laufzeit-Diensten. Alles läuft in einem Railway-Projekt; die Dienste sprechen über Railways privates Netz miteinander.

### 14.1 Stack

| Bereich | Wahl | Hinweis |
| --- | --- | --- |
| Framework | Next.js 16, App Router, React 19 | Neuesten Patch der 16er-Linie installieren; am 3. November 2026 erschien ein Sicherheits-Release ([Next.js Blog](https://nextjs.org/blog)) |
| Sprache | TypeScript, `strict` |  |
| Styling | Tailwind CSS 4, Tokens als CSS-Variablen |  |
| Komponenten | shadcn/ui auf Radix, in `packages/ui` übernommen und angepasst | Keine zweite Komponentenbibliothek |
| Datenbank | Railway Postgres, Prisma (Mehrdatei-Schema) | `pg_trgm` und Volltext für die Suche |
| Authentifizierung | Better Auth: E-Mail und Passwort, Passkeys, TOTP, Sitzungsliste | Sitzungen in Postgres |
| Cache, Queue, Pub/Sub | Railway Redis, BullMQ | Rate Limits, Jobs, Echtzeit-Verteilung |
| Dateien | Railway Buckets (S3-kompatibel, privat) | Zugriff nur über signierte URLs |
| Echtzeit | Eigener WebSocket-Dienst | Authentifiziert über kurzlebiges Token aus der Web-App |
| Validierung, Formulare | Zod, React Hook Form |  |
| i18n | next-intl, übersetzte Pfade | de, fr, it, en |
| Diagramme | Recharts oder visx, gekapselt in `packages/ui` | Eine Bibliothek |
| Tests | Vitest, Playwright, axe |  |
| Monitoring | Railway Logs und Metriken, Sentry-kompatibles Fehlertracking | Keine personenbezogenen Inhalte in Logs |

### 14.2 Dienste auf Railway

```text
Railway-Projekt (Umgebungen: production, staging, PR-Umgebungen)

  öffentliche Domain
        |
        v
  +-----------+        +------------+        +-------------+
  |   web     |<------>|  realtime  |        |   worker    |
  |  Next.js  |  Redis |  WebSocket |        |   BullMQ    |
  +-----+-----+  Pub/  +------+-----+        +------+------+
        |        Sub          |                     |
        |   privates Netz (*.railway.internal)      |
        +---------------+-----+---------------------+
                        |
      +-----------------+------------------+------------------+
      v                 v                  v                  v
 +----------+     +-----------+     +-------------+    +-------------+
 | Postgres |     |   Redis   |     | Bucket      |    | Bucket      |
 | + Backups|     |           |     | originals   |    | derivatives |
 +----------+     +-----------+     +-------------+    +-------------+

  cron (Railway Cron-Dienst): Aufbewahrung, Ablauf von Anfragen und Stories,
                              Verifizierungs-Erinnerungen, Suchindex-Abgleich
```

| Dienst | Aufgabe | Öffentlich |
| --- | --- | --- |
| `web` | Seiten, Server Actions, Route Handler, Medien-Auslieferung, Admin | Ja |
| `realtime` | WebSocket für Messenger, Anfragen, Benachrichtigungen | Ja (eigene Subdomain) |
| `worker` | Medienverarbeitung, E-Mail, Benachrichtigungen, Statistik-Aggregation | Nein |
| `cron` | Geplante Aufgaben, startet, erledigt, beendet sich | Nein |
| Postgres, Redis | Daten, Cache und Queue | Nein, nur privates Netz |

- Konfiguration als Code (`railway.json` pro Dienst), Healthcheck-Pfad pro Dienst, Migrationen als Pre-Deploy-Schritt von `web`.
- Geheimnisse ausschliesslich als Railway-Variablen, pro Umgebung getrennt, mit Referenzvariablen für Datenbank und Bucket.
- EU-Region für alle Dienste und Buckets. Die Bucket-Region lässt sich nach dem Anlegen nicht ändern.
- Postgres mit täglichen Backups und einem dokumentierten, getesteten Restore. Zusätzlich ein verschlüsselter Dump in einen dritten Bucket per Cron.

### 14.3 Medien

Railway Buckets sind privat und S3-kompatibel; es gibt keine öffentlichen Buckets ([Railway Docs](https://docs.railway.com/storage-buckets)). Daraus folgt der Ablauf:

1. Der Client holt von `web` eine signierte Upload-URL (Dateityp, Grösse und Kontingent geprüft) und lädt direkt in `originals`.
2. `worker` prüft die Datei (Typ anhand des Inhalts, Malware), entfernt EXIF und GPS, erzeugt Varianten (AVIF und WebP, feste Breiten) und einen Farb-Platzhalter und schreibt sie nach `derivatives`.
3. Das Medium steht auf «In Prüfung», bis die Moderation es freigibt.
4. Auslieferung über `web` unter `/media/[id]/[variante]`: Öffentliche, freigegebene Varianten werden mit langem Cache ausgeliefert; geschützte prüfen Sitzung und Berechtigung und leiten auf eine kurzlebige signierte URL um.
5. Löschen entfernt Original und alle Varianten per Job und bestätigt es im Protokoll. Buckets haben laut Railway derzeit keine Lifecycle-Regeln und keine Versionierung; Aufbewahrung wird deshalb im `cron`-Dienst umgesetzt.

Video (Phase 3) nutzt denselben Ablauf mit einem Transcoding-Job (ffmpeg im `worker`, als eigener Dienst skalierbar).

### 14.4 Suche

Die Suche liegt hinter der Schnittstelle `SearchPort` in `packages/core/search`. Die erste Implementierung nutzt Postgres: eine denormalisierte Tabelle `search_profile`, die bei jeder Profil-, Verfügbarkeits- und Statusänderung per Job aktualisiert wird, mit Volltext-, Trigram- und Filterindizes. Sie enthält ausschliesslich öffentliche, freigegebene Daten. Meldet die Messung mehr als 500 ms am 95. Perzentil, kommt Meilisearch als weiterer Railway-Dienst hinter dieselbe Schnittstelle.

### 14.5 Module und Datenmodell

Die 19 Module und die Entitäten aus v1.0 (Abschnitte 12.2 und 12.3) gelten. Ergänzt werden: `SavedSearch`, `Collection`, `ChatLabel`, `MessageTemplate`, `Block`, `Report`, `OrganizationInvite`, `Follow`, `SearchProfile` (Index), `MediaVariant`, `StatDaily` (aggregierte Kennzahlen), `Appeal`. Jedes Modul besitzt seine Tabellen; andere Module greifen nur über dessen exportierte Funktionen zu.

### 14.6 Leistungsziele

Unverändert aus v1.0: LCP unter 2,5 s, INP unter 200 ms, CLS unter 0,1 (jeweils 75. Perzentil), Suchanfragen unter 500 ms serverseitig (95. Perzentil). Marktplatz- und Profilseiten werden auf dem Server gerendert; Studio-Seiten laden ihre Daten auf dem Server und streamen.

## 15. Projektstruktur

Die Struktur macht kleine Dateien zum Normalfall: Eine Route-Datei setzt nur zusammen, die Logik liegt in Modulen.

```text
/
├─ apps/
│  ├─ web/                         Next.js
│  │  ├─ app/[locale]/
│  │  │  ├─ layout.tsx             Root: Schrift, Tokens, Provider
│  │  │  ├─ (shell)/               EINE Shell für alles ausser Admin
│  │  │  │  ├─ layout.tsx          AppHeader, GlassTabBar, ModeSwitch
│  │  │  │  ├─ (marktplatz)/       /, suche, p/[name], c/[slug], ch/..., touren
│  │  │  │  ├─ (community)/        community/...
│  │  │  │  ├─ (mitglied)/         ich, nachrichten, termine, favoriten, einstellungen
│  │  │  │  ├─ (info)/             hilfe, sicherheit, recht, preise
│  │  │  │  └─ studio/
│  │  │  │     ├─ layout.tsx       nur StudioSidebar; Kopfzeile kommt von oben
│  │  │  │     ├─ (anbieter)/      profil, medien, kalender, anfragen, statistik ...
│  │  │  │     └─ o/[org]/         Organisations-Kontext
│  │  │  ├─ (auth)/                anmelden, registrieren, passwort
│  │  │  └─ admin/                 eigene Shell
│  │  ├─ app/media/[id]/[variante]/route.ts
│  │  ├─ features/                 UI pro Modul: search/, profile/, messaging/,
│  │  │                            booking/, studio-today/, media/, reviews/ ...
│  │  │  └─ <modul>/
│  │  │     ├─ components/         eine Komponente pro Datei
│  │  │     ├─ actions/            eine Server Action pro Datei
│  │  │     ├─ queries/            eine Abfrage pro Datei
│  │  │     └─ schemas.ts          Zod-Schemas des Moduls
│  │  └─ messages/<sprache>/<namensraum>.json
│  ├─ realtime/                    WebSocket-Dienst
│  ├─ worker/                      BullMQ: ein Job pro Datei
│  └─ cron/                        eine Aufgabe pro Datei
├─ packages/
│  ├─ ui/                          Designsystem: tokens/, components/, glass/
│  ├─ core/                        Domänenlogik ohne Framework, ein Ordner pro Modul
│  │  └─ <modul>/                  service.ts, policy.ts (Berechtigungen), types.ts, *.test.ts
│  ├─ db/                          prisma/schema/*.prisma, migrations/, seed/
│  ├─ auth/                        Better-Auth-Konfiguration, Sitzungs-Helfer
│  ├─ storage/                     Bucket-Client, signierte URLs
│  ├─ jobs/                        Queue-Definitionen, Payload-Schemas
│  └─ config/                      eslint, tsconfig, tailwind
└─ docs/decisions/                 ein kurzer Entscheid pro Datei
```

**Modulgrenzen**

- `packages/core` kennt weder React noch Next.js. `apps/web/features` enthält keine Geschäftsregeln.
- Jede Berechtigung steht in `policy.ts` des Moduls als reine Funktion (`canViewConversation(actor, conversation)`) und hat Tests für jede Rolle.
- Eine `page.tsx` hat höchstens etwa 80 Zeilen: Daten laden, Abschnitte zusammensetzen, Metadaten.
- Importe zwischen Modulen laufen nur über deren `index.ts`. Eine Lint-Regel verbietet tiefe Importe.
- pnpm-Workspaces mit Turborepo; jeder Railway-Dienst baut nur sein Paket und dessen Abhängigkeiten.

## 16. Sicherheit, Datenschutz und rechtliche Gates

Diese Regeln haben Vorrang vor jeder anderen Anforderung und vor jedem Termin. Der Agent baut keine Abkürzung um sie herum, auch nicht «vorläufig».

### 16.1 Nicht verhandelbar

- Kein Anbieterprofil wird öffentlich ohne abgeschlossene Volljährigkeits- und Identitätsprüfung mit Lebendigkeitsprüfung und ohne manuelle Freigabe.
- Die Plattform verbietet und entfernt: Profile Minderjähriger, nicht freiwillige Dienstleistungen, Menschenhandel und Ausbeutung, Identitätsmissbrauch, Medien ohne Einwilligung der Abgebildeten, Erpressung, Doxxing.
- Verdachtsfälle auf Minderjährigkeit oder Zwang sperren den Inhalt sofort und gehen an Trust & Safety. Der Meldeweg `/melden` funktioniert ohne Konto.
- Ausweisdokumente verarbeitet ein dafür geeigneter Dienstleister. Die Plattform speichert Prüfergebnis, Zeitpunkt und Ablauf, keine Dokumentkopien.
- Organisationen erhalten nie Zugriff auf private Nachrichten, Ausweisdaten oder private Kalender verknüpfter Anbieter.
- Bezahlte Leistungen beeinflussen weder Verifizierungssignale noch Bewertungen noch die organische Reihenfolge.
- Keine genaue Adresse wird veröffentlicht oder aus Daten ableitbar gemacht. Regionen wählt der Anbieter.
- Keine Behauptung von Ende-zu-Ende-Verschlüsselung, Kopierschutz oder «Sicherheit» durch Verifizierung, die technisch nicht zutrifft.
- Keine erfundenen Profile, Bewertungen, Aktivitäten oder Reichweitenzahlen, auch nicht zum Start.

### 16.2 Technische Mindestanforderungen

- Autorisierung auf Objektebene in jeder Server-Funktion, mit Tests pro Rolle. IDs sind nicht erratbar; Antworten verraten nicht, ob ein fremdes Objekt existiert.
- Rate Limits auf Anmeldung, Registrierung, Nachrichten, Anfragen, Meldungen und Suche. Schutz vor Massenregistrierung.
- Sitzungen in sicheren, `HttpOnly`-Cookies; CSRF-Schutz; strikte Content Security Policy; Upload-Prüfung anhand des Dateiinhalts.
- Admin-Zugang nur mit zweitem Faktor. Jeder Zugriff auf sensible Daten erzeugt einen Audit-Eintrag ohne Kopie des Inhalts.
- Logs und Fehlertracking enthalten keine Nachrichtentexte, keine Ausweisdaten, keine Suchbegriffe mit Personenbezug.
- Private Nachrichten werden nicht an externe KI- oder Übersetzungsdienste gesendet.
- Für jede Datenklasse gibt es eine Aufbewahrungsfrist in `packages/core/retention`, die der `cron`-Dienst durchsetzt. Export und Löschung sind Selbstbedienung.
- Abhängigkeits-Scan in der CI; ein unabhängiger Penetrationstest vor dem öffentlichen Start.

### 16.3 Gates vor dem öffentlichen Start (Phase 0)

Kein Code ersetzt diese Klärungen. Sie sind Aufgaben für Alexander und für Fachpersonen, nicht für den Agenten.

- [ ] Rechtliche Einordnung des Geschäftsmodells und der Plattformhaftung in der Schweiz, inklusive kantonaler Regeln und Bewilligungen
- [ ] Verfahren für Alters- und Identitätsprüfung und Wahl des Dienstleisters
- [ ] Datenschutz-Folgenabschätzung nach revDSG (und DSGVO für die Expansion), inklusive Datenstandort EU statt Schweiz
- [ ] Schriftliche Bestätigung von Railway, dass der Betrieb dieser Plattform mit ihren Inhalten zulässig ist ([Acceptable Use Policy](https://railway.com/legal/fair-use))
- [ ] Zahlungsdienstleister, der Abos und Werbung für diese Branche ausdrücklich unterstützt
- [ ] E-Mail-Versand über einen Anbieter, der die Branche zulässt
- [ ] Moderationskonzept mit Besetzung, Reaktionszeiten und Eskalationsweg zu Behörden und Fachstellen
- [ ] Plan für den Fall, dass ein Infrastruktur-Anbieter kündigt: Der Stack bleibt containerbasiert und S3-kompatibel, damit ein Umzug in Tagen möglich ist

## 17. Phasen und Abnahmekriterien

Der Agent arbeitet die Schritte in dieser Reihenfolge ab. Ein Schritt ist fertig, wenn seine Kriterien als automatisierte Tests grün sind und die Übergabe geschrieben ist.

### Phase 1: Marktplatz und Studio-Kern

| Schritt | Inhalt | Fertig, wenn |
| --- | --- | --- |
| 1.1 Fundament | Monorepo, Railway-Dienste, CI mit Lint, Typen, Tests und Dateigrössen-Prüfung, Staging-Umgebung | Ein leerer Deploy läuft auf Staging; eine Datei mit 601 Zeilen lässt die CI fehlschlagen |
| 1.2 Designsystem | Tokens, Inter, alle Komponenten aus 5.4, Glas-Bausteine, `/dev/ui` | Jede Komponente zeigt alle Zustände hell und dunkel; Kontrasttest grün; axe ohne schwere Befunde |
| 1.3 Shell | Kopfzeile, Mega-Menü, `ModeSwitch`, Studio-Seitenleiste, mobile Glas-Navigation, Altersprüfung, i18n | Wechsel Marktplatz ↔ Studio lädt die Kopfzeile nicht neu; Mega-Menü ist nur mit Tastatur bedienbar; bei 320 px kein horizontales Scrollen |
| 1.4 Konto | Registrierung, Anmeldung, Passkeys, 2FA, Sitzungen, Einstellungen, Export, Löschung | Abnahmekriterien 20.1 aus v1.0 |
| 1.5 Verifizierung und Onboarding | Identitätsprüfung über Dienstleister-Schnittstelle, acht Onboarding-Schritte, Prüfwarteschlange im Admin | Kein Profil wird ohne Prüfung und Freigabe öffentlich, per Test für jede Statuskombination belegt |
| 1.6 Profil und Medien | Profil-Editor mit Live-Vorschau, Medien-Pipeline, öffentliches Profil, Eigentümer-Leiste | 20.2 aus v1.0; Upload entfernt EXIF nachweislich; Vorschau und öffentliches Profil nutzen dieselben Komponenten |
| 1.7 Suche | Entdecken, Suche mit Filtern, Landingpages, Favoriten, gespeicherte Suchen | 20.3 aus v1.0; pausierte und gesperrte Profile erscheinen in keinem Suchpfad; Filterzustand überlebt Neuladen und Zurück |
| 1.8 Nachrichten | Inbox für Mitglieder und Studio, Echtzeit, Blockieren, Melden, Labels | 20.4 aus v1.0; ein Test versucht mit jeder Rolle, fremde Chats zu lesen, und scheitert |
| 1.9 Termine | Verfügbarkeit, Kalender, Anfrage, Gegenvorschlag, Statusverlauf, Erinnerungen | 20.5 aus v1.0; Absagen ist in jedem Status für beide Seiten möglich |
| 1.10 Bewertungen | Bewertung nach bestätigtem Termin, Stellungnahme, Meldung, Einspruch | Ohne qualifizierenden Termin lässt sich keine Bewertung anlegen, auch nicht über die API |
| 1.11 Clubs | Unternehmensprofil, Nachweise, Standorte, Einladung und Verknüpfung | Eine Organisation kann mit keiner Rolle Nachrichten oder Ausweisdaten eines Anbieters abrufen |
| 1.12 Studio Heute und Statistik | Aufgabenliste, vier Kennzahlen, Trichter, Tagesaggregation | Zahlen stimmen mit den Rohereignissen eines Testdatensatzes überein |
| 1.13 Admin | Benutzer, Moderation, Regionen, Kategorien, CMS, Audit-Log, Feature Flags | 20.6 aus v1.0 |
| 1.14 Härtung | Playwright für Journeys A bis D, Lasttest der Suche, Restore-Test, Sicherheitsprüfung | 20.7 aus v1.0; Leistungsziele aus 14.6 auf Staging gemessen und dokumentiert |

### Phase 2 bis 4

| Phase | Inhalt |
| --- | --- |
| 2 Monetarisierung | Pro- und Business-Tarif, Zahlungsanbindung für Plattformleistungen, Rechnungen, bezahlte Platzierungen mit Kennzeichnung, Kampagnen, Vorlagen, Detailstatistik, Team-Rechte |
| 3 Community | Feed, Beiträge, Stories, Blogs, Veranstaltungen, Touren, Folgen, Video-Pipeline |
| 4 Ökosystem | Forum, Suche in natürlicher Sprache, Profil-Assistent, Übersetzungen, API, weitere Länder |

### Abnahme der Oberfläche (gilt für jede Seite)

1. Die Seite verwendet ausschliesslich Tokens und Komponenten aus `packages/ui`.
2. Sie hat Lade-, Leer-, Bereit- und Fehlerzustand, jeweils in einem Test sichtbar gemacht.
3. Sie ist mit der Tastatur allein vollständig bedienbar; der Fokus ist immer sichtbar.
4. Sie besteht axe ohne Befunde der Stufen «serious» und «critical».
5. Sie funktioniert bei 320, 375, 768, 1024 und 1280 px sowie bei 200 % Zoom ohne horizontales Scrollen.
6. Sie enthält keines der Muster aus 4.3.
7. Alle Texte kommen aus den Übersetzungsdateien und sind in vier Sprachen vorhanden.
8. Unter 768 px ist Glas nur auf der Navigationsebene; mit `prefers-reduced-transparency` ist sie deckend.

## 18. Offene Entscheide

Diese Punkte habe ich für den Entwurf entschieden. Jeder lässt sich ändern, bevor der Agent startet.

| Thema | Im Dokument gesetzt | Alternative |
| --- | --- | --- |
| Fliesstext-Schrift | Inter auch für Text und Bedienelemente | Eine Serifenschrift nur für lange Texte (Profilbeschreibung, Blog) für mehr Magazin-Charakter |
| Akzentfarbe | Tannengrün #1F4D43 auf warmem Papierweiss | Jede andere Farbe, solange sie die Kontrastprüfung besteht und kein Verlauf wird |
| Name des Dashboards | «Studio» | «Mein Bereich», «Business» |
| Produktname | Offen; im Code als `APP_NAME` konfigurierbar | – |
| Suche | Postgres zuerst, Meilisearch bei Bedarf | Meilisearch von Anfang an als Railway-Dienst |
| Authentifizierung | Better Auth | Auth.js wie in v1.0 |
| Ansprache | Du-Form | Sie-Form |
| Reels | Aus Phase 3 gestrichen, nur Stories und Beiträge | Reels in Phase 3 mit Video-Pipeline |
| Sterne-Durchschnitt | Nicht auf Karten und nicht im Profilkopf | Durchschnitt ab einer Mindestzahl Bewertungen |

**So verwendest du das Dokument als Prompt:** Gib dem Coding-Agenten dieses Dokument vollständig und die PRD v1.0 als Anhang mit (sie enthält die Funktionsanforderungen FR-AUTH bis FR-BUSINESS und die Abnahmekriterien 20.1 bis 20.7, auf die hier verwiesen wird). Starte mit: «Lies beide Dokumente. Beginne mit Phase 1, Schritt 1.1. Fasse vorher in zehn Sätzen zusammen, was du bauen wirst und welche Fragen offen sind.»

## Quellen

- [Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) – Liquid Glass für die Navigationsebene, nicht für Inhalt
- [Railway Docs: Storage Buckets](https://docs.railway.com/storage-buckets) – private, S3-kompatible Buckets, Region nicht änderbar
- [Railway Guide: Storage Buckets für Uploads](https://railway.com/guides/storage-buckets-guide) – signierte URLs, Auslieferung über Backend
- [Railway Acceptable Use Policy](https://railway.com/legal/fair-use)
- [Next.js Blog](https://nextjs.org/blog) – Sicherheits-Release vom 3. November 2026

Stand der Angaben zu Railway und Next.js: 16. November 2026, aus Suchergebnissen der offiziellen Seiten. Der Agent prüft sie vor der Umsetzung gegen die aktuelle Dokumentation.
