# 0011 Medien-Pipeline (Schritt 1.6)

**Stand:** 17.11.2026

## Ablauf

Nach PRD v2 14.3, in vier Teilen:

1. **Upload anmelden** (`requestUpload` in `packages/core/src/media`):
   - Nur mit eigenem Anbieterprofil; archivierte und gesperrte Profile nehmen keine neuen Medien an.
   - Prüft Typ (JPEG, PNG, WebP, HEIC), Grösse (höchstens 20 MB), Kontingent (60 pro Profil) und die Bestätigung der Rechte (`rightsConfirmed: true`, PRD v1 FR-MEDIA-002, gespeichert als `rightsConfirmedAt`).
   - Legt das Medium in UPLOADING an, mit einem zufälligen Schlüssel ohne Bezug zu Konto oder Datei (`o/<192 Bit>`).
   - Gibt eine URL für den direkten Upload in den Bucket «originals», 10 Minuten gültig.
2. **Upload bestätigen** (`confirmUpload`):
   - Prüft Eigentum und ob das Objekt im Bucket liegt.
   - Setzt PROCESSING und legt den Job `media-process` an.
3. **Verarbeiten** im Worker (`apps/worker/src/jobs/process-media.ts`):
   - Typ anhand der Magic Bytes (`file-type`), nicht der Angabe des Browsers.
   - Drehen nach EXIF-Orientierung und neu kodieren mit `sharp`.
   - Varianten AVIF und WebP in 320, 640, 960 und 1440 px, nie hochskaliert; dazu Breite, Höhe und dominante Farbe.
   - Varianten nach «derivatives», Status IN_REVIEW.
   - Unzulässiges endet in FAILED mit Grund-Schlüssel, das Original wird gelöscht.
4. **Moderation** (`decideMedia`): Freigeben, zur Korrektur oder sperren, atomar nur aus IN_REVIEW, mit Begründung und Regel im Audit-Log.

Löschen setzt `deletedAt` und legt den Job `media-delete` an. Er entfernt Original und alle Varianten und bestätigt das mit `media.purged` im Audit-Log. Die Schlüssel stehen in der Payload, damit das Löschen auch gelingt, wenn die Zeile inzwischen weg ist.

## Metadaten und Original

- **Metadaten:** sharp übernimmt ohne `keepMetadata` keine Metadaten. Varianten enthalten damit weder EXIF noch GPS, XMP, IPTC oder eingebettete Profile.
- **Original:** Nach der Verarbeitung ersetzt eine neu kodierte, metadatenfreie Fassung das hochgeladene Original. So liegen auch im privaten Bucket keine GPS-Daten mehr. Ausgeliefert wird das Original nie.
- **Nachweis:** Tests in `apps/worker` und `apps/web/e2e/media-library.spec.ts` prüfen das. Sie erzeugen ein JPEG mit GPS-Tags samt einem erkennbaren Text und zeigen, dass weder Text noch EXIF in einer Variante oder im Original bleiben.

## Malware-Prüfung

PRD v1 12.5 und v2 14.3 verlangen eine Malware-Prüfung. Ein Scanner ist zurzeit nicht verfügbar.

- **Entscheid:** Jede Datei wird vollständig dekodiert und neu kodiert. Ausgeliefert werden nur Pixel, die sharp neu geschrieben hat. Angehängte Daten, Polyglot-Dateien, eingebettete Skripte und Metadaten fallen dabei weg. Der Typ wird am Inhalt geprüft. Bilder über etwa 100 Megapixel lehnt sharp ab (Schutz vor Dekompressionsbomben).
- **Lücke:** Das hochgeladene Original liegt bis zur Verarbeitung ungeprüft im privaten Bucket. Ein Fehler in einem Decoder (libvips, libheif, libjpeg) liesse sich mit einer präparierten Datei im Worker ausnutzen.
- **Später:** ClamAV als eigener Dienst auf Railway, aufgerufen vor `processImage`. Den Worker begrenzt bis dahin nur, dass er keinen öffentlichen Port hat.

## Auslieferung

Die Route ist `/media/[id]/[variante]`. Gültig sind nur die festen Variantennamen (`parseVariantName`).

- **Öffentlich und freigegeben**, Profil sichtbar (PUBLISHED, PAUSED, RESTRICTED): `web` liest die Variante und liefert sie selbst aus, mit `public, max-age=31536000, immutable`.
  - **Begründung:** Eine presigned URL liefe ab, lange bevor der Cache des Browsers oder eines CDN verfällt. Eine Weiterleitung mit langem Cache wäre dann kaputt.
  - **Kosten:** Varianten sind klein (unter 1 MB). Ein CDN vor `web` übernimmt die Last.
- **Nur Mitglieder:** Verlangt eine Sitzung eines aktiven, altersbestätigten Kontos (`isMediaMember`). Antwort ist eine Weiterleitung auf eine presigned URL, 60 Sekunden gültig, mit `private, no-store`.
- **Eigentümer:** Sieht seine Medien in jedem Status ausser FAILED und gelöscht, ebenfalls über eine kurzlebige Weiterleitung.
- **Moderation:** Die Vorschau hat eine eigene Route `/media/review/[id]/[variante]`. Sie gilt nur für Medien IN_REVIEW, nur für Prüfrollen mit zweitem Faktor.
- **Sonst:** 404 mit `private, no-store`. Die Antwort ist gleich, ob es das Medium gibt oder nicht.
- **CSP:** Beim Treiber s3 ergänzt `apps/web/proxy.ts` `connect-src` (Upload) und `img-src` (Weiterleitungen) um die Herkünfte der Buckets. Mit virtual-hosted style ist das `https://<bucket>.<host>`, mit `S3_FORCE_PATH_STYLE=true` der Host von `S3_ENDPOINT`.

**Bekannte Grenze:** Wird ein öffentliches, freigegebenes Medium später gesperrt, gelöscht oder auf «Mitglieder» gestellt, können Browser und CDN die Variante bis zu einem Jahr behalten. Die URL ist durch `mediaUrl` fest vorgegeben. Abhilfe wäre ein Versionsteil in der URL oder ein Purge des CDN beim Sperren. Das ist ein offener Punkt für die Moderation (Schritt 1.13).

## Speicher

Das Paket `packages/storage` stellt die Schnittstelle `ObjectStorage` bereit, mit zwei Treibern:

- **s3:** `@aws-sdk/client-s3`, ein Client pro Bucket mit eigenen Zugangsdaten. Die presigned Upload-URL signiert `Content-Type` und die genaue `Content-Length`. Eine andere Grösse oder ein anderer Typ scheitert damit am Bucket. Path-Style ist über `S3_FORCE_PATH_STYLE` einstellbar.
- **fs:** Für Entwicklung und Tests, unter `STORAGE_FS_ROOT`, Standard `/home/user/gotit-local/storage`. Die Ablage liegt ausserhalb des Repos, weil Turbopack das Repo beobachtet. Bei `APP_ENV=production` ist fs verboten.
  - Die presigned URLs zeigen auf `/api/storage/upload/<token>` und `/api/storage/object/<token>`.
  - Das Token ist HMAC-signiert mit `BETTER_AUTH_SECRET` und eigenem Präfix `storage:`.
  - Die Upload-Route begrenzt Länge und Inhaltstyp. In der Produktion und beim Treiber s3 antworten beide Routen mit 404.

## Oberfläche

- **Bibliothek** `/studio/medien`:
  - Raster mit Drag-and-drop, Mehrfachauswahl und Sammelaktionen (Sichtbarkeit, Löschen).
  - Menü pro Medium mit «Nach vorne», «Nach hinten», «Als Titelbild festlegen», «Medium bearbeiten» und «Medium löschen».
  - Status und Sichtbarkeit als Wort mit Icon.
- **Upload:**
  - Fortschritt pro Datei über `FileDrop`, Fehler pro Datei mit Grund und «Erneut versuchen».
  - Uploads leben auf Modulebene und laufen weiter, wenn die Seite im Studio wechselt.
  - Der Hinweis zu EXIF und GPS erscheint, solange das Konto noch nie etwas hochgeladen hat.
- **Detail** `/studio/medien/[id]`: Alternativtext, Sichtbarkeit (Schalter, speichert sofort), Titelbild, Löschen mit Dialog «Medium löschen» und der Hinweis der Moderation.
- **Onboarding:** Der Schritt «Medien» zeigt dieselbe Bibliothek. Im Entwurf ist das Studio noch zu, deshalb gibt es dort keine Detailseite. «Schritt überspringen» bleibt.
- **Admin** `/admin/medien` und `/admin/medien/[id]`:
  - Die Warteschlange zeigt keine Vorschau.
  - Im Einzelfall ist die Vorschau zuerst verdeckt und erscheint erst mit «Medium anzeigen».
  - Ein Entscheid verlangt Begründung und Regel (M-1 bis M-5).

## Offen

- **HEIC:** Die vorkompilierten sharp-Binärdateien dekodieren kein HEVC. HEIC-Uploads werden angenommen und enden mit dem Grund «heic-unsupported» und einer klaren Anleitung. Eine Lösung wäre libvips mit libheif und libde265 im Worker-Image (Lizenz prüfen) oder eine Umwandlung im Browser.
- **Zuschneiden:** Ein Fokuspunkt fehlt noch.
- **Wieder einreichen:** Bei «Zur Korrektur» lädt der Anbieter ein neues Foto hoch; ein bestehendes Medium lässt sich nicht erneut zur Prüfung senden.
- **CORS der Buckets:** Für den direkten Upload muss der Bucket «originals» `PUT` von `APP_URL` mit der Kopfzeile `content-type` erlauben. Das ist auf Railway noch nicht geprüft.
- **Verwaiste Uploads:** Nie bestätigte Uploads (UPLOADING, älter als eine Stunde) belegen kein Kontingent mehr. Ihre Objekte und Zeilen räumt später der `cron`-Dienst auf.
- **Hängende Jobs:** Scheitert `media-process` nach allen fünf Versuchen, bleibt das Medium in PROCESSING. Der `cron`-Dienst sollte solche Medien auf FAILED setzen.
