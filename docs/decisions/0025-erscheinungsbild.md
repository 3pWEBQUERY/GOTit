# 0025 Neues Erscheinungsbild: «TheGND», Aubergine, Serifen

**Stand:** 18.11.2026

Grundlage: Vorgabe der Betreiberin vom 18.11.2026 mit zwei Referenzbildern. Farben und Schrift kommen aus dem ersten Bild (ruhig, elegant, Aubergine, Serifen), der Seitenaufbau aus dem zweiten (Suche mit Filterspalte und Listenkarten, Profil mit Reitern, Studio mit Kennzahlen und Diagramm). Die Funktionen bleiben, wie sie sind; nur die Oberfläche ändert sich.

Dieser Entscheid ersetzt folgende Regeln der PRD v2.0. Alles andere aus Abschnitt 5 gilt weiter: Tokens statt Rohwerte, Kontrast, Fokus, Zustände, Breiten, Glas nur in der Navigation.

| PRD v2.0 | Bisher | Neu |
| --- | --- | --- |
| 5 Richtung | «ruhiges Hospitality-Produkt», bewusst kein Violett | Ruhig und hochwertig, mit einem dunklen Rahmen: Kopfzeile, Hero und Studio-Seitenleiste dunkel, Inhalt warm hell. Akzent Aubergine. Weiterhin kein Pink, kein Gold, kein Rot, keine Neonfarben |
| 5.1 Akzent | Tannengrün `#1F4D43` / `#7FC4B0` | Aubergine `#5E3758` / `#D9AFCF`; Neutraltöne leicht pflaumenwarm. Werte in `packages/ui/src/tokens/color.css`, Kontrasttest unverändert streng |
| 5.2 Schrift | Inter für alles | Newsreader (Serifen, variabel, selbst gehostet) für Wortmarke, `text-display`, `text-h1` und `text-h2`. Inter für `text-h3`, Fliesstext und Bedienelemente |
| 5.3 Fotos | «Text steht unter dem Bild, nicht darauf» | Auf Profilkarten im Raster stehen Name, Alter und Ort auf dem Foto, über einem dunklen Schleier (`scrim-bottom`). In Listen und auf der Profilseite steht Text weiterhin neben dem Bild |
| 4.3 Verläufe | keine Verläufe | Einzige Ausnahme: der Schleier `scrim-bottom` für die Lesbarkeit von Text auf Fotos. Nie als Schmuck auf Flächen, Buttons oder Text |
| 18 Name | offen, `APP_NAME` («GOTit») | **TheGND**. `APP_NAME` bleibt konfigurierbar; der Standardwert ist jetzt «TheGND» |

## Dunkle Flächen ohne eigene Tokens

Alle Farb-Tokens sind mit `light-dark()` definiert. Eine dunkle Fläche setzt `scheme-dark` (`color-scheme: dark`). Darin lösen alle Tokens auf ihren dunklen Wert auf, und jede Komponente aus `packages/ui` passt sich ohne Änderung an. Die dunkle Fläche hat damit dieselben geprüften Kontraste wie der Dunkelmodus.

## Was bewusst nicht aus den Bildern übernommen wird

- **Fotos von Personen als Dekoration** (Hero, Kategorie-Kacheln): Die Plattform zeigt nur Fotos von Profilen, die ihre Inhaberinnen freigegeben haben. Der Hero zeigt deshalb die Titelbilder freigegebener Profile, und Kategorien sind Kacheln ohne Foto.
- **Erfundene Zahlen und Merkmale**, die es nicht gibt: Sternbewertungen mit Durchschnitt, «Trust-Level 95 %», «Jetzt verfügbar» für jedes Profil, Kilometer ab dem eigenen Standort. Es erscheinen nur Angaben, die die Plattform wirklich hat: Prüfungen, Bewertungen nach bestätigtem Termin, Region, Preise, Sprachen.
- **Grüne Häkchen für Prüfungen:** Verifizierungssignale bleiben neutral (PRD 5.1), weil Grün «sicher» versprechen würde.
