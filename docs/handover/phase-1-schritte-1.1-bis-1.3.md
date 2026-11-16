# Übergabe Phase 1, Schritte 1.1 bis 1.3

**Stand:** 16.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Fundament, Designsystem und Shell sind gebaut und lokal vollständig getestet. Nicht erfüllt ist das Abnahmekriterium von 1.1 «Ein leerer Deploy läuft auf Staging»: Auf Railway ist nichts angelegt (Gründe unten).

## Was gebaut ist

### 1.1 Fundament

- pnpm-Monorepo mit Turborepo: `apps/web`, `apps/realtime`, `apps/worker`, `apps/cron`, `packages/ui`, `core`, `db`, `auth`, `jobs`, `config`.
- Prisma als Mehrdatei-Schema (`packages/db/prisma/schema/*.prisma`, eine Datei pro Modul), erste Migration, Seed mit Referenzdaten (26 Kantone, 5 freigegebene Städte, Feature Flags) und getrennt davon fiktiven Testkonten.
- ESLint mit `max-lines` 600 (Fehler), `max-lines-per-function` 120 (Warnung), `page.tsx` höchstens 80 Zeilen, Verbot tiefer Importe, TypeScript `strict` ohne `any`.
- Dateigrössen-Prüfung `pnpm check:file-size` für `.ts`, `.tsx`, `.css`, `.prisma`, `.json` unter `apps/` und `packages/`; verbietet zusätzlich `utils.ts` und `part1.tsx`.
- CI (`.github/workflows/ci.yml`): Dateigrösse, Lint, Typen, Unit-Tests, Abhängigkeits-Scan, End-to-End mit Postgres und Redis.
- Railway-Konfiguration als Code pro Dienst (`apps/*/railway.json`), Healthchecks, Migration als Pre-Deploy-Schritt; Beschreibung in `docs/railway.md`.
- Echtzeit-Dienst: nimmt nur Verbindungen mit kurzlebigem, signiertem Token an und stellt Ereignisse nur dem adressierten Konto zu. Worker und Cron sind lauffähige Rahmen; Jobs und Aufgaben kommen mit ihren Schritten.

### 1.2 Designsystem

- Tokens aus PRD 5.1 bis 5.3 als CSS-Variablen in `packages/ui/src/tokens/`, von Tailwind 4 über `@theme` gelesen. Die Standardpalette, Radien, Schatten und Breakpoints von Tailwind sind entfernt.
- Inter Variable mit `opsz` über `next/font`, beim Build selbst gehostet.
- Liquid Glass nach PRD 5.5 inklusive Rückfall ohne `backdrop-filter` und bei `prefers-reduced-transparency` und `prefers-contrast: more`.
- Alle Komponenten aus PRD 5.4 in zehn Gruppen, je eine pro Datei, Texte nur über Props. Regeln in `packages/ui/CONVENTIONS.md`.
- Testseiten unter `/de/dev/ui/<gruppe>`, in der Produktion abgeschaltet.

### 1.3 Shell

- Eine Shell für Marktplatz, Community, Mitgliederbereich und Studio unter demselben Root-Layout; das Studio fügt nur die Seitenleiste hinzu.
- Desktop: Kopfzeile 64 px, Mega-Menüs «Entdecken» und «Community» als Disclosure-Navigation, «Mehr» als einfaches Menü, `ModeSwitch` nur für Anbieter und Organisationsmitglieder, Kontextwahl «Mein Profil» oder Organisation, Befehlspalette mit `Ctrl/Cmd + K`.
- Studio-Seitenleiste 232 px, zwischen 1024 und 1279 px auf 64 px einklappbar (Zustand im Cookie gemerkt), «Profil pausieren» unten mit Rückgängig im Toast.
- Tablet: Navigation im Seiten-Sheet, eingeklappte Seitenleiste.
- Mobile: Glas-Top-Leiste und schwebende Glas-Tab-Leiste mit den Tabs aus PRD 6.4, Schrumpfen beim Scrollen, Sheet «Mehr» im Studio, Entdecken-Sheet.
- Altersprüfung vor Marktplatz und Community mit sicherem Rücksprungziel.
- Vier Sprachen mit übersetzten Pfaden (`/de/fuer-anbieter`, `/fr/pour-prestataires` …), Texte pro Sprache und Namensraum in eigenen Dateien.
- Zugriffsregeln aus PRD 8.2: `/studio` führt Besucher zur Anmeldung mit `?weiter=`, Mitglieder ohne Anbieterrolle zu «Für Anbieter», begonnene Rollen ins Onboarding, Organisationsmitglieder in ihren Kontext; fremde Organisationen antworten mit 404.
- Seiten mit Inhalt: Altersprüfung, Entdecken (ehrlicher Leerzustand, bis 1.7 die Suche liefert), Für Anbieter, Studio Heute (Prüfstatus), Organisation Heute, 404 und 500 mit nächstem Schritt.
- Strikte Content Security Policy mit Nonce pro Anfrage, Sicherheits-Header, Rate Limit auf der Anmeldung.

## Was getestet ist (ausgeführt am 16.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | 442 Dateien, keine über 600 Zeilen |
| Lint und Typen, alle 10 Pakete | grün |
| Unit-Tests | grün, davon 454 im Designsystem; dazu Domänenlogik (Rollen, Pausieren, Flags, Altersprüfungs-Token, Rücksprungziel), Echtzeit-Dienst, Dateigrössen-Prüfung, Übersetzungen (gleiche Schlüssel in vier Sprachen, keine Ausrufezeichen) |
| Kontrasttest der Tokens | alle Text-Paare ≥ 4,5 : 1, Bedienelement-Ränder ≥ 3 : 1, hell und dunkel |
| Produktions-Build aller Dienste | grün |
| Playwright gegen den Produktions-Build | 60 von 60 grün |

Die End-to-End-Tests belegen die Abnahmekriterien von 1.2 und 1.3:

- **Wechsel ohne Neuladen der Kopfzeile:** Marktplatz ↔ Studio lässt die Kopfzeile derselbe DOM-Knoten bleiben, mit Rückkehr zur zuletzt besuchten Seite.
- **Mega-Menü nur mit Tastatur:** Enter und Leertaste öffnen, Tab in die Links, Escape schliesst mit Fokus zurück, Shift+Tab schliesst. Es öffnet nicht auf Hover, und ein Klick ausserhalb schliesst.
- **Breiten:** kein horizontales Scrollen bei 320, 375, 768, 1024 und 1280 px sowie bei 640 px (entspricht 200 % Zoom bei 1280).
- **axe:** keine Befunde der Stufen «serious» und «critical» auf allen zehn Designsystem-Seiten hell und dunkel, auf der Altersprüfung, im Studio, auf den übersetzten Seiten und im Dunkelmodus der Shell.
- **Weitere Belege:**
  - Die mobile Navigation ist bei «mehr Kontrast» deckend, es sind höchstens drei Glasflächen gleichzeitig sichtbar, und die Kapsel sitzt 12 px vom Rand.
  - Pausieren und Rückgängig funktionieren.
  - Die Rollen-Weiterleitungen aus PRD 8.2 greifen.
  - Fremde Organisationen antworten mit 404.
  - Die Altersprüfung leitet nicht auf fremde Seiten weiter.

## Was nicht geprüft ist

- **Staging-Deploy auf Railway.** Nicht angelegt, weil es Kosten verursacht und PRD 16.3 vorher die schriftliche Bestätigung von Railway zur Acceptable Use Policy verlangt. Das Abnahmekriterium «Ein leerer Deploy läuft auf Staging» ist damit **offen**.
- **Die CI auf GitHub ist noch nie gelaufen.** Lokal sind dieselben Befehle grün. Ob die GitHub-Runner den Workflow so ausführen (Dienst-Container, Browser-Installation), zeigt erst der erste Lauf.
- **Echte Geräte:** Glas über Fotos, Blur-Leistung auf Mittelklasse-Android, Safe Areas auf iOS. Geprüft ist nur in Chromium.
- **Screenreader:** Geprüft sind nur axe und die zugänglichen Namen in Tests, nicht VoiceOver oder NVDA.
- **Ziehen am Sheet-Griff per Finger:** Implementiert, aber nur die Tastaturbedienung ist getestet.

## Offene Punkte

### Braucht eine Entscheidung oder Unterlagen von Alexander

1. **PRD v1.0 fehlt.** v2.0 verweist für Funktionsanforderungen (FR-AUTH bis FR-BUSINESS), Entitäten (12.2, 12.3) und die Abnahmekriterien 20.1 bis 20.7 darauf. Schritt 1.4 und folgende lassen sich ohne sie nur aus v2.0 ableiten. Das Datenmodell ist bis dahin bewusst minimal (`docs/decisions/0003`).
2. **Railway:** Projekt anlegen, sobald die AUP-Bestätigung vorliegt. Die Konfiguration ist bereit (`docs/railway.md`).
3. **Dienstleistungskategorien:** Die PRD nennt keine. Die Navigation zeigt bis dahin nur «Alle Kategorien» (`docs/decisions/0004`).
4. **Altersprüfung für Besucher:** Umgesetzt als Selbstauskunft. Ob das genügt, ist Teil der rechtlichen Einordnung (`docs/decisions/0002`).
5. **Produktname:** offen; Voreinstellung «GOTit» über `APP_NAME`.

### Technisch, für die nächsten Schritte

- Die Wochenansicht des Kalenders ist unter 768 px sehr eng. Die Kalenderseite (1.9) muss dort die Tagesansicht zeigen, wie PRD 11.5 es vorsieht.
- Kalendereinträge unter etwa 45 Minuten ragen wegen der Mindesthöhe von 44 px über ihr Ende hinaus.
- Das Bottom-Sheet der Vertrauenssignal-Erklärung auf Mobile (PRD 10) ist ein Popover; Umstellung beim Bau der Profilseite (1.6).
- Navigationsziele aus Phase 1, deren Schritt noch fehlt (zum Beispiel `/suche`, `/anmelden`), führen auf die 404-Seite mit nächstem Schritt.
- Die Registrierung ist bis 1.4 abgeschaltet; Konten entstehen nur über den Seed.

## Nächster Schritt

1.4 Konto: Registrierung mit Kontotyp und E-Mail-Bestätigung, Anmeldung, Passkeys, TOTP, Sitzungsliste, Einstellungen, Export, Löschung.
