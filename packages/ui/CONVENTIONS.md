# Konventionen des Designsystems

Verbindlich für jede Komponente in `packages/ui`. Grundlage ist die PRD, Abschnitte 4.3, 5 und 13.

## Dateien

- Eine Komponente pro Datei: `src/components/<gruppe>/<kebab-name>.tsx`, benannter Export, kein Default-Export.
- Jede Gruppe exportiert über ihr `index.ts`. `src/index.ts` exportiert die Gruppen; es wird nicht pro Komponente angefasst.
- Zielgrösse 300 Zeilen, harte Grenze 600. Wächst eine Datei, wird nach Verantwortung geteilt (Teil-Komponente, Hook), nie `part1.tsx` oder `utils.ts`.
- `"use client"` nur, wenn die Datei Zustand, Effekte, Event-Handler oder Radix verwendet.

## Gestaltung

- Nur Token-Klassen: `bg-bg`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-ink-muted`, `border-border`, `border-border-strong`, `bg-accent`, `text-on-accent`, `text-error`, `text-warning`, `text-success`, `text-info`. Keine Hex-Werte, keine Verläufe, keine anderen Farbnamen (ein Test prüft das).
- Schrift: `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-small`, `text-label`. Nichts unter 13 px. Zahlen mit Klasse `tabular`.
- Radien: `rounded-chip` (6), `rounded-control` (10), `rounded-card` (16), `rounded-sheet` (28), `rounded-full`.
- Abstände: nur 1, 2, 3, 4, 6, 8, 12, 16, 24 (4 bis 96 px).
- Tiefe: Inhalt hat keinen Schatten (Trennung durch Linie oder Fläche). `shadow-raised` für Menüs und Popover, `shadow-floating` für Dialoge, Sheets und mobile Navigation. Keine Karten in Karten.
- Bewegung: `duration-state` (150 ms) für Zustandswechsel, `duration-layer` (250 ms) für Ebenenwechsel, Animationen `animate-fade-in`, `animate-layer-in`, `animate-sheet-in`, `animate-panel-in`. Keine Animation ohne Funktion.
- Breakpoints: `xs` 480, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536. Mobile zuerst.
- Glas (`.glass`) nur auf der mobilen Navigationsebene (PRD 5.5), nie auf Karten, Listen oder Bildern.
- Icons: nur `lucide-react`, `strokeWidth={1.5}`, `aria-hidden`. Kein Emoji, kein Sparkle.
- Akzent nur für die primäre Aktion, aktive Navigation und Fokus. Status nie nur über Farbe: immer Icon und Wort. «Anzeige» und Verifizierungssignale sind neutral (Tinte auf Fläche), nie grün.

## Verhalten

- Jede Komponente hat die Zustände, die für sie gelten: Ruhe, Hover, Fokus, aktiv, deaktiviert, lädt, Fehler.
- Tippflächen mindestens 44 × 44 px (`min-h-11`, `size-11`).
- Alles ist mit der Tastatur bedienbar. Der globale Fokusring (`:focus-visible`) wird nicht entfernt.
- Jedes Icon ohne Text hat einen zugänglichen Namen (Pflicht-Prop).
- Kein Spinner über Flächen: Ladezustände sind Skelette in der Form des Inhalts.
- Bei 320 px Breite und 200 % Zoom kein horizontales Scrollen; Texte dürfen 30 % länger werden, Buttons wachsen, nichts wird abgeschnitten.
- Overlays basieren auf Radix (`import { Dialog } from "radix-ui"`): Fokus wird gefangen und kehrt zum Auslöser zurück, Escape schliesst.

## Texte

- Komponenten enthalten keine sichtbaren oder vorgelesenen Texte. Alles kommt über Props (`label`, `labels={{ close: … }}`), damit die App es aus den Übersetzungsdateien liefert.
- Datum und Zahl formatiert die App und gibt fertige Strings herein, oder die Komponente bekommt `locale` und nutzt `Intl`.

## Links

- Navigation über `UiLink` aus `src/link/ui-link.tsx`, nie `<a>` direkt und nie `next/link`.

## Testseite

- Jede Gruppe hat eine Testseite unter `/dev/ui/<gruppe>` (nur ausserhalb der Produktion): `apps/web/features/dev-ui/sections/<gruppe>-section.tsx`. Sie zeigt jede Komponente in allen Zuständen. Beispieltexte dort sind erkennbar fiktiv («Beispielname»), Fotos sind neutrale Flächen mit Initialen.
