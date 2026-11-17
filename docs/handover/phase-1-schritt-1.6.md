# Übergabe Phase 1, Schritt 1.6 (Profil und Medien)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Anbieter pflegen ihr Profil pro Abschnitt mit Live-Vorschau und laden Bilder hoch. Die Bilder werden geprüft, bereinigt und erst nach Freigabe gezeigt. Die öffentliche Profilseite `/p/[name]` steht. Zu den Abnahmekriterien von 1.6:
- Kriterien 20.2 aus v1.0: erfüllt.
- «Upload entfernt EXIF nachweislich»: durch einen Test belegt.
- «Vorschau und öffentliches Profil nutzen dieselben Komponenten»: ein einziger Renderer `ProfileView`.

Entscheide: `docs/decisions/0011-medien.md` und `0012-profil.md`.

## Was gebaut ist

### Profil

- **Öffentliche Seite** `/p/[name]` und `/p/[name]/medien`:
  - Breadcrumbs, Galerie mit Lightbox oder neutrale Fläche mit Initialen.
  - Getrennte Vertrauenssignale mit Erklärung. «Fotos geprüft» erscheint nur bei mindestens einem freigegebenen Bild.
  - Preise mit Stand, ohne Preise «Preise auf Anfrage».
  - Pausiert: Hinweis ohne Kontakt, `noindex`. Nur für Mitglieder: Hinweis für Besucher.
  - Gesperrt, nicht freigegeben oder abgelaufene Identität ergibt eine echte 404.
- **Ein Renderer** `ProfileView` für die Profilseite, die Studio-Vorschau mit ungespeicherten Werten und die Onboarding-Vorschau.
- **Eigentümer-Leiste:** «Bearbeiten» öffnet den Abschnitt als Seitenpanel über dem Profil, mit eigener URL.
- **Studio** `/studio/profil/[abschnitt]` mit sieben Abschnitten: Basis, Beschreibung, Angebot, Preise (ein- und ausblenden), Kontakt, Sichtbarkeit, Regionen.
  - Ungespeichertes wird abgefragt und lokal zwischengespeichert.
- **Prüfpflichtige Änderungen:** neuer Anzeigename, zusätzliche Kontaktwege, zusätzliche Regionen.
  - Sie warten in einem Prüffall «Änderung»; das bisherige Profil bleibt online.
  - Einschränkendes gilt sofort.
  - Im Admin werden vorher und nachher gegenübergestellt.

### Medien

- **Speicherpaket** `packages/storage` mit zwei Treibern: S3 für Railway, Dateisystem für Entwicklung und Tests (nie in der Produktion).
- **Upload:**
  - Direkt in den privaten Bucket über eine signierte URL; Typ, genaue Grösse und Kontingent (60) sind festgelegt.
  - Die Bestätigung der Rechte und Einwilligungen der abgebildeten Personen ist Pflicht.
- **Worker:**
  - Prüft den Typ am Inhalt, dreht das Bild und kodiert es neu.
  - Entfernt EXIF und GPS, auch aus dem gespeicherten Original.
  - Erzeugt 8 Varianten (AVIF und WebP in 4 Breiten) und eine Platzhalterfarbe.
  - Danach steht das Bild auf «In Prüfung».
- **Moderation** `/admin/medien`:
  - Vorschau zuerst verdeckt.
  - Entscheid mit Begründung und Regel; atomar und im Audit-Log.
- **Auslieferung** `/media/[id]/[variante]`:
  - Öffentlich freigegebene Bilder liefert `web` aus, 10 Minuten im Cache.
  - Bilder nur für Mitglieder, eigene Bilder in Prüfung und die Admin-Vorschau gehen über eine signierte URL von 60 Sekunden ohne Cache.
  - Alles andere ergibt 404.
- **Studio** `/studio/medien`:
  - Raster mit Drag-and-drop und Tastatur («Nach vorne» und «Nach hinten»), Mehrfachauswahl.
  - Fortschritt pro Datei; ein Fehler nennt den Grund und bietet «Erneut versuchen».
  - Detailseite mit Alternativtext, Sichtbarkeit, Titelbild und Löschen.

## Was getestet ist (ausgeführt am 17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | 899 Dateien, keine über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 30 von 30 Aufgaben grün |
| Playwright gegen den Produktions-Build, alle Schritte 1.1 bis 1.6 | **150 von 150 grün** (ein Test auf die neue Cache-Regel angepasst, dann grün) |

Die Medien-Tests belegen:
- Ohne Bestätigung der Rechte kein Upload.
- Original und Varianten ohne GPS.
- Erst nach Freigabe öffentlich.
- Mitglieder-Bilder nur angemeldet.
- Fremde oder unbekannte Bilder ergeben 404.
- Löschen entfernt die Dateien.
- Eine Textdatei als `.jpg` endet als «Fehlgeschlagen» mit Grund.

## Unterwegs behoben

- **Cache öffentlicher Bilder:** von einem Jahr auf 10 Minuten. Gelöschte oder gesperrte Bilder wären sonst bis zu einem Jahr abrufbar geblieben.
- **CI:** Der Job «Lint, Typen, Tests» bekommt Postgres und Redis; die Integrationstests hätten auf GitHub sonst nicht laufen können.
- **Turbo-Cache:** Turbo unterscheidet Builds nach Build-Ordner. Vorher konnte ein Test unbemerkt gegen einen alten Build laufen.

## Was nicht geprüft ist

- **Upload direkt in den Railway-Bucket aus dem Browser (CORS):** Lokal läuft der Dateisystem-Treiber. Ob Railway-Buckets einen direkten Upload von der App-Domain zulassen, zeigt erst der erste echte Upload in der Produktion. Falls nicht, ist der Ausweg ein Upload über `web`; das ist im Entscheid 0011 beschrieben.
- **HEIC (iPhone-Fotos):** Die Bildbibliothek kann HEVC nicht lesen. Solche Uploads enden mit einer Anleitung, das Foto als JPEG zu exportieren.

## Offene Punkte

1. **Malware-Scanner** (ClamAV) als eigener Dienst. Heute schützt die vollständige Neukodierung; die Lücke ist in 0011 beschrieben.
2. **Zuschneiden mit Fokuspunkt** ist nicht gebaut.
3. **«Zur Korrektur» bei Bildern:** Ein solches Bild lässt sich nur neu hochladen, nicht erneut einreichen.
4. **Cron-Aufgabe** für nie bestätigte Uploads und Bilder, die nach allen Versuchen in der Verarbeitung hängen.
5. **Kontaktaktionen** auf der Profilseite kommen mit 1.8 und 1.9. Bis dahin steht ein ehrlicher Satz statt toter Knöpfe.
6. **`/melden`** wird verlinkt, die Seite kommt mit 1.13.
7. **Kleinere Aufräumarbeiten:**
   - Ungenutzte Übersetzungsschlüssel im Onboarding entfernen.
   - Die Kontaktleiste soll eine Form für Hinweise ohne Aktionen bekommen.
   - Die Shell soll einen offiziellen Weg bekommen, die mobile Tab-Leiste auszublenden.
