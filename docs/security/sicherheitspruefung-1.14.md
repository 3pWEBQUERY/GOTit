# Sicherheitsprüfung 1.14 (intern)

**Stand:** 18.11.2026 · **Grundlage:** PRD v2.0 Abschnitt 16, PRD v1.0 Abschnitte 10 und 20.7 · **Stand des Codes:** `bc10a4f` plus die hier beschriebenen Änderungen (nicht committet).

> **Wichtig:** Diese Prüfung ist eine **interne Durchsicht** des Codes durch das Entwicklungsteam. Sie ist **nicht** der «erfolgreiche unabhängige Sicherheitscheck» aus v1 20.7 und nicht der «unabhängige Penetrationstest vor dem öffentlichen Start» aus v2 16.2. Wer den Code schreibt, übersieht systematisch dieselben Dinge, die er beim Schreiben übersehen hat. Vor dem öffentlichen Start braucht es einen externen Penetrationstest (Umfang unten).

## 1. Umfang

Der ganze Code im Repository, nicht nur eine Änderung:

- `apps/web`: `proxy.ts` (CSP, kanonischer Host), `next.config.ts` (Kopfzeilen), alle Route Handler (`app/**/route.ts`) und alle Server Actions (`features/**/actions`, `features/admin/**`), Markdown des CMS.
- `packages/auth`: Better Auth (Cookies, Sitzungen, 2FA, Passkeys, Rate Limits, Passwortregeln), Sperr-Hook (`hooks.ts`), Token des Echtzeit-Dienstes.
- `packages/core`: Autorisierung in jeder Funktion mit `actorId`, Moderation, Meldungen, Export, Löschung, Aufbewahrung, Rate Limits.
- `packages/storage`: Treiber fs (Pfade) und s3 (presigned URLs).
- `apps/worker` (Bildverarbeitung), `apps/realtime` (WebSocket), `apps/cron` (Fristen).
- Abhängigkeiten (`pnpm audit --prod`), Geheimnisse im Repository und in der Git-Historie.
- Betrieb auf Railway, soweit von aussen prüfbar (Staging `staging.thegnd.net`).

Nicht im Umfang: Railway selbst, Resend, der künftige Prüfdienstleister für Identität, Browser und Endgeräte, organisatorische Abläufe der Moderation.

## 2. Methode

- **Lesen mit Suchmustern:** Jede Datei mit `"use server"` und jeder `route.ts` wurde auf Sitzungsprüfung und Übergabe an den Kern geprüft; jede exportierte Kernfunktion mit `actorId` auf `assertPermission`, `assertModerator` oder `assertReviewer` (Skript über alle Dateien, Abweichungen von Hand gelesen). Stichproben auf Objektebene (IDOR) in Nachrichten, Anhängen, Labels, Favoriten, Standorten von Organisationen, Medien und Terminen; Suche nach Schreibzugriffen nur über `where: { id }`.
- **Eingaben:** zod-Schemas, serverseitige `fetch` mit Adressen aus Eingaben (keine), Rückleitungen (`safeReturnPath`, `callbackURL`), Pfade im Treiber fs, Upload-Typ und -Grösse, `sharp`-Grenzen, Markdown, `dangerouslySetInnerHTML` (keins).
- **Protokolle:** alle Aufrufe von `logger.*` und `console.*` auf Inhalte, Adressen und Token.
- **Geheimnisse:** `git ls-files`, `git log -p --all` mit Mustern für API-Schlüssel, Datenbank-URLs mit Passwort, private Schlüssel.
- **Abhängigkeiten:** `pnpm audit --prod` am 18.11.2026.
- **Proben auf Staging** (lesend, ohne Konto): Antwortkopfzeilen; ob ein vom Client gesetztes `X-Real-IP` die Rate Limits erreicht (siehe B-19).
- **Tests:** Jede Korrektur der Stufe Mittel hat einen Integrationstest gegen Postgres und Redis.

## 3. Befunde

Stufen: **Hoch** (direkt ausnutzbar, schwerer Schaden), **Mittel** (ausnutzbar mit Voraussetzungen oder Verstoss gegen eine Muss-Anforderung), **Niedrig** (Härtung), **Info** (Hinweis, kein Handlungsbedarf im Code). Es gab keinen Befund der Stufe Hoch.

| ID | Stufe | Ort | Befund | Status |
| --- | --- | --- | --- | --- |
| B-01 | Mittel | `packages/core/src/moderation/intake.ts:48` | Sofortsperre durch jedes Konto | behoben, Test |
| B-02 | Mittel | `packages/core/src/account/export.ts` | Datenexport unvollständig | behoben, Test |
| B-03 | Mittel | `packages/core/src/retention/purge.ts:35` | Mediendateien gelöschter Konten bleiben in den Buckets | behoben, Test |
| B-04 | Mittel | `packages/auth/src/server.ts:70` | Passkey ohne Benutzerverifikation genügt auch für den Admin-Zugang | behoben, Test |
| B-05 | Mittel | `packages/core/src/retention/policy.ts` | Aufbewahrungsfristen fehlen für die meisten Datenklassen | offen, Entscheid der Betreiberin |
| B-06 | Niedrig | `apps/worker/package.json` (`nodemailer` 7.0.13) | 21 Meldungen von `pnpm audit`, davon 5 «high» | behoben: `nodemailer` 10.6.0; picomatch (GHSA-fc5q-39xc-vjpf, nur über better-auth → vitest, zur Laufzeit nie geladen, keine behobene Version) in `pnpm-workspace.yaml` ausgenommen |
| B-07 | Niedrig | `apps/web/features/account/actions/register.ts:33` | Antwortzeit verrät vergebene Adresse | behoben |
| B-08 | Niedrig | `apps/realtime/src/server.ts:62` | Echtzeit-Dienst prüft `Origin` nicht | behoben, Test; Variable am Dienst nötig |
| B-09 | Niedrig | `apps/realtime/src/server.ts` | Offene WebSocket-Verbindung überlebt Sperre und Abmeldung | offen |
| B-10 | Niedrig | `packages/auth/src/server.ts:64` | Secure-Cookies hingen an `NODE_ENV` | behoben |
| B-11 | Niedrig | `packages/auth/src/server.ts:57` | `/verify-password` mit Standardgrenze 60 pro Minute | behoben |
| B-12 | Niedrig | `apps/web/next.config.ts` | `Cross-Origin-Opener-Policy` fehlte | behoben |
| B-13 | Niedrig | `packages/auth/src/server.ts:26` | Admin-Sitzungen gelten 30 Tage wie alle anderen | offen |
| B-14 | Niedrig | `packages/auth/src/server.ts` | Rate Limits nur pro Adresse, nicht pro Konto | offen |
| B-15 | Niedrig | `packages/core/src/support/tickets.ts:31` | `/kontakt` schickt eine Bestätigung an jede eingegebene Adresse | akzeptiert |
| B-16 | Niedrig | `apps/worker/src/media/process-image.ts:17` | Kein Virenscan; Decoder im Worker als Angriffsfläche | offen (Entscheid 0011) |
| B-17 | Info | `packages/jobs/src/enqueue.ts:25` | E-Mail-Jobs mit Token-Links bleiben 24 Stunden in Redis | akzeptiert |
| B-18 | Info | `apps/web/proxy.ts:29`, `next.config.ts` | CSP mit `style-src-attr 'unsafe-inline'`; HSTS ohne `preload` | akzeptiert |
| B-19 | Info | `packages/core/src/rate-limit/subject.ts` | `x-real-ip` ist auf Railway nicht fälschbar (geprüft) | kein Befund |
| B-20 | Info | Entscheid 0024 | Sicherungen enthalten gelöschte Konten bis zu 12 Monate | offen, Datenschutzerklärung |
| B-21 | Info | `pnpm audit` | `picomatch` (kein Patch), `esbuild` (nur Windows-Dev-Server), nur in Entwicklungswerkzeugen | akzeptiert |
| B-22 | Info | Schema | Nach der Löschung bleiben Supportanfragen, Terminanfragen bei Anbietern und Meldungen mit Kopien | offen, mit B-05 |

### B-01 Sofortsperre durch jedes Konto (Mittel, behoben)

- **Ort:** `fileReport` in `packages/core/src/moderation/intake.ts`.
- **Befund:** Eine Meldung aus einem Konto mit kritischem Grund (Minderjährigkeit, Ausbeutung, akute Gefahr) sperrte den gemeldeten Inhalt sofort, auch ein ganzes Profil. Ein Konto entsteht in wenigen Minuten (3 Registrierungen pro Stunde und Adresse, 10 Meldungen pro Stunde und Konto).
- **Ausnutzung:** Eine Konkurrentin registriert ein Konto, bestätigt die Adresse und meldet 10 Profile pro Stunde als «Verdacht auf Minderjährige». Alle sind sofort offline, bis Trust & Safety entscheidet; mit mehreren Konten und Adressen beliebig viele.
- **Korrektur:** Nach dem Vorschlag aus Entscheid 0020 («Offen», Punkt 1) sperrt eine kritische Meldung nur noch automatisch, wenn das meldende Konto seine Adresse bestätigt hat, mindestens 7 Tage alt ist und in den letzten 24 Stunden höchstens 2 andere Sofortsperren ausgelöst hat. Eskaliert wird weiterhin jede kritische Meldung, und Trust & Safety sieht sie zuoberst.
- **Test:** `cases.integration.test.ts`, «Sofortsperre nur durch vertrauenswürdige Konten»: neues und unbestätigtes Konto sperren nicht, das vierte Profil am selben Tag bleibt öffentlich.
- **Rest:** Ein altes Konto kann weiterhin 3 Profile pro Tag sofort sperren. Die übrigen Punkte aus Entscheid 0020 (falsche Meldungen schränken das Konto ein, feste Frist für Trust & Safety) sind organisatorisch und offen.

### B-02 Datenexport unvollständig (Mittel, behoben)

- **Ort:** `exportOwnData` in `packages/core/src/account/export.ts`.
- **Befund:** Der Export enthielt Konto, Einstellungen, Sitzungen, Sicherheitsprotokoll, Zustimmungen, eigene Nachrichten, Labels, Blockierungen und von einem Anbieterprofil nur Name und Status. Es fehlten Profilinhalt, Regionen, Leistungen, Preise, Kalender, Prüfergebnis der Identität, Medien, Sammlungen, gespeicherte Suchen, Bewertungen, Meldungen, Einschränkungen, Terminanfragen und Supportanfragen. PRD 16.2 verlangt den Export als Selbstbedienung; das revDSG (Art. 25) gibt ein Auskunftsrecht über alle Personendaten.
- **Korrektur:** Alle genannten Klassen sind enthalten (`format: gotit-account-export/2`). Bewusst nicht enthalten: Passwort-Hash, 2FA-Geheimnis, Sitzungstoken, die Referenz des Prüfdienstleisters, interne Notizen des Supports, wer in der Moderation entschieden hat, Beweiskopien in eigenen Meldungen (das sind Nachrichten Dritter) und Angaben zum anfragenden Konto bei Terminanfragen an das eigene Profil.
- **Test:** `packages/core/src/account/export.integration.test.ts`.

### B-03 Mediendateien gelöschter Konten bleiben liegen (Mittel, behoben)

- **Ort:** `purgeExpiredData` in `packages/core/src/retention/purge.ts`.
- **Befund:** Nach 30 Tagen Löschfrist löscht der Cron-Dienst das Konto; die Kaskade entfernt die Zeilen der Medien, aber nicht die Dateien in den Buckets «originals» und «derivatives». Chat-Bilder wurden schon vorher entfernt (Entscheid 0014), Profilmedien nicht.
- **Ausnutzung:** Kein Angriff von aussen (die Schlüssel enthalten Zufallsteile, die Auslieferung prüft die Zeile). Aber Fotos einer Person, die ihr Konto gelöscht hat, liegen unbegrenzt bei Railway; bei einem Leck der Bucket-Zugangsdaten wären sie abrufbar. Verstoss gegen die Löschpflicht.
- **Korrektur:** `purgeMediaObjectsOfUsers` (`packages/core/src/media/purge-storage.ts`) entfernt vor dem Löschen der Konten Original und alle Varianten jedes Mediums dieser Konten. Fehler gehen ins Log ohne Schlüssel und brechen die Löschung nicht ab.
- **Test:** `packages/core/src/media/purge-storage.integration.test.ts`.
- **Rest:** Dateien, die vor dieser Änderung schon verwaist sind, räumt niemand auf. Bisher gab es in der Produktion keine abgelaufene Löschung (Versand seit 17.11.2026 aktiv), deshalb vermutlich keine; prüfen lässt sich das mit einem Abgleich der Bucket-Schlüssel gegen `media_asset.originalKey` und `media_variant.key`.

### B-04 Passkey ohne Benutzerverifikation (Mittel, behoben)

- **Ort:** Passkey-Plugin in `packages/auth/src/server.ts`.
- **Befund:** Das Plugin verlangte die Benutzerverifikation nur «preferred». Eine Anmeldung mit Passkey ersetzt Passwort und zweiten Faktor. Ein Sicherheitsschlüssel ohne PIN ist aber nur ein Faktor (Besitz). Der Admin-Zugang prüft `twoFactorEnabled` des Kontos, nicht, wie die Sitzung entstand.
- **Ausnutzung:** Wer einen Sicherheitsschlüssel einer Admin-Person ohne PIN in die Hand bekommt, meldet sich ohne Passwort und ohne Code an und hat vollen Admin-Zugang (PRD 16.2 «Admin-Zugang nur mit zweitem Faktor»).
- **Korrektur:** `userVerification: "required"` für Registrierung und Anmeldung; der Server prüft das Flag bei der Antwort (`requireUserVerification`).
- **Test:** `packages/auth/src/server.integration.test.ts`, «Passkeys».
- **Folge:** Schon registrierte Schlüssel ohne PIN funktionieren nicht mehr; die Person meldet sich mit Passwort an und richtet eine PIN ein oder legt einen neuen Passkey an.

### B-05 Aufbewahrungsfristen fehlen (Mittel, offen)

- **Ort:** `RETENTION_DAYS` in `packages/core/src/retention/policy.ts`.
- **Befund:** PRD 16.2 verlangt für **jede** Datenklasse eine Frist in `packages/core/retention`, die der Cron-Dienst durchsetzt. Festgelegt sind nur Löschfrist des Kontos (30 Tage), Sicherheitsprotokoll (365), E-Mail-Ausgang (7), abgelaufene Token (1), dazu Rohereignisse der Statistik (3 Tage nach der Aggregation, Entscheid 0019) und nie gesendete Chat-Bilder (24 Stunden, Entscheid 0014). Ohne Frist und unbegrenzt gespeichert: Audit-Log, Meldungen samt Beweiskopien, Supportanfragen, Nachrichten und Termine aktiver Konten, Prüfergebnisse der Identität, abgeschlossene Einschränkungen, Tageszahlen der Statistik.
- **Warum nicht behoben:** Fristen sind eine rechtliche Entscheidung (Zweck, Rechtsgrundlage, Aufbewahrungspflichten, Beweissicherung bei Straftaten) und gehören in die Datenschutz-Folgenabschätzung (Gate 16.3). Der Code erfindet sie nicht. Vorschlag zur Entscheidung in `docs/security/datenschutz-und-sicherheit.md`, Abschnitt 8.

### B-06 nodemailer (Niedrig, behoben)

- **Befund:** `pnpm audit --prod` meldet 23 Lücken (6 high, 15 moderate, 2 low). 21 davon betreffen `nodemailer@7.0.13` im Worker (Adressparser, CRLF-Injektion, TLS-Prüfung bei OAuth2, DoS). Behoben erst in `nodemailer` ≥ 10.1.4, also mit zwei Hauptversionen Sprung.
- **Einstufung Niedrig:** `nodemailer` läuft nur bei `MAIL_TRANSPORT=smtp`. Produktion nutzt `resend` (HTTP-API), Staging `outbox`. Empfänger sind vorher mit zod als E-Mail geprüft.
- **Warum nicht behoben:** Auftrag dieser Prüfung war, nur Patch- und Minor-Upgrades selbst vorzunehmen. Für `nodemailer` gibt es keines.
- **Folge für die CI:** Der Schritt `pnpm audit --prod --audit-level high` in `.github/workflows/ci.yml` schlägt mit diesen Meldungen fehl.
- **Behoben (18.11.2026):** `nodemailer` 10.6.0 und `@types/nodemailer` 8.0.2. Der Worker nutzt nur `createTransport(url)` und `sendMail({ from, to, subject, text })`; Typen und Tests des Workers sind grün. Danach meldet `pnpm audit --prod --audit-level high` nur noch picomatch (GHSA-fc5q-39xc-vjpf): Es kommt über better-auth → vitest in den Produktionsbaum, wird zur Laufzeit nie geladen, und eine behobene Version gibt es nicht. Diese eine Meldung ist in `pnpm-workspace.yaml` (`auditConfig.ignoreGhsas`) ausgenommen; die Ausnahme fällt weg, sobald picomatch behoben ist.

### B-07 Antwortzeit der Registrierung (Niedrig, behoben)

Die Antwort war für eine vergebene Adresse gleich, aber deutlich schneller (kein Passwort-Hash, keine Schreibzugriffe). Jetzt rechnet der Server auch dann einen Hash. Datenbankzugriffe bleiben ein kleiner Unterschied; das Rate Limit (3 pro Stunde und Adresse) begrenzt Messreihen. Kein eigener Test (Zeitmessungen sind in der CI nicht stabil).

### B-08 Origin beim Echtzeit-Dienst (Niedrig, behoben)

Der Dienst nahm jede Verbindung mit gültigem Token an, unabhängig vom `Origin`. Das Token ist kurzlebig (60 Sekunden) und nur über eine POST-Anfrage mit Cookie erhältlich, deshalb war das kein direkter Angriff. Jetzt weist der Dienst eine Verbindung mit fremdem `Origin` mit 403 ab. Erlaubt sind `REALTIME_ALLOWED_ORIGINS` (kommagetrennt) oder sonst die Herkunft von `APP_URL`. **Betrieb:** Am Dienst `realtime` ist `APP_URL` heute nicht gesetzt (docs/railway.md); ohne Variable bleibt die Prüfung aus. Test: `apps/realtime/src/server.test.ts`.

### B-09 Offene WebSocket-Verbindung nach Sperre (Niedrig, offen)

Eine bestehende Verbindung bleibt nach Abmeldung oder Sperre offen. Sie trägt nur IDs von Unterhaltungen («etwas Neues in Unterhaltung X»), keine Inhalte; das Nachladen geht über `web` und scheitert ohne Sitzung. Ein gesperrtes Konto erfährt so höchstens, dass jemand schreibt. Abhilfe: ein Ereignis `session.revoked` aus `revokeCachedSessions`, auf das der Dienst die Verbindungen des Kontos schliesst.

### B-10 Secure-Cookies (Niedrig, behoben)

`useSecureCookies` hing an `NODE_ENV === "production"`. Auf Railway ist `NODE_ENV` bewusst nicht gesetzt (docs/railway.md); `next start` setzt es zur Laufzeit, aber ein anderer Start (zum Beispiel ein Skript mit `getAuth()`) hätte Cookies ohne `Secure` geschrieben, obwohl Better Auth bei einer `https`-Adresse sonst selbst `Secure` wählt. Jetzt folgt die Einstellung dem Protokoll von `APP_URL`. Die Cookies sind `HttpOnly`, `SameSite=Lax`, ohne `Domain` (nur der Host) und tragen das Präfix `__Secure-`.

### B-11 Grenzen für Passwortprüfung (Niedrig, behoben)

`/verify-password` (Passwort mit bestehender Sitzung prüfen) lief unter der allgemeinen Grenze von 60 pro Minute. Mit einem gestohlenen Sitzungs-Cookie liesse sich das Passwort raten, um es zum Beispiel für `/two-factor/disable` zu verwenden. Jetzt 5 pro Minute und Adresse, ebenso `/change-password`.

### B-12 Cross-Origin-Opener-Policy (Niedrig, behoben)

`Cross-Origin-Opener-Policy: same-origin` für alle Antworten. Ein fremdes Fenster, das die Plattform öffnet, erhält keinen Verweis darauf (Tabnabbing, Fenster-Orakel).

### B-13 Sitzungsdauer für Admins (Niedrig, offen)

Alle Sitzungen gelten 30 Tage und verlängern sich täglich; Admin-Sitzungen ebenso. Sensible Aktionen (Konto sperren, Rollen vergeben, Ausweisdaten aufdecken) verlangen keine erneute Anmeldung. Empfehlung: für Konten mit interner Rolle eine kürzere Dauer (zum Beispiel 12 Stunden ohne Verlängerung) oder ein «frischer» zweiter Faktor für die genannten Aktionen. Better Auth kennt dafür `freshAge`; die Prüfung gehört dann in `assertPermission`.

### B-14 Rate Limits pro Adresse (Niedrig, offen)

Anmeldung (5 pro Minute), zweiter Faktor (5 pro Minute), Registrierung und öffentliche Formulare zählen pro Client-Adresse. Wer viele Adressen hat (Botnetz, Proxy-Pool), rät verteilt Passwörter eines Kontos. Gegenmittel heute: Passwörter ab 12 Zeichen, zweiter Faktor mit Sperre nach Fehlversuchen pro Anmeldung (Better Auth). Ein Limit pro Konto (zum Beispiel 20 Fehlversuche pro Stunde) hätte die Kehrseite, dass Dritte ein Konto aussperren können; Entscheid offen.

### B-15 Bestätigung an beliebige Adresse (Niedrig, akzeptiert)

Ohne Konto schickt `/kontakt` eine Eingangsbestätigung an die eingegebene Adresse. Der Text ist fest (Nummer und Link), nicht vom Absender bestimmt; höchstens 5 pro Stunde und Adresse. Als Spam-Weg ungeeignet, deshalb akzeptiert.

### B-16 Bildverarbeitung (Niedrig, offen)

Typ wird am Inhalt erkannt (`file-type`), `sharp` mit `limitInputPixels: 100 000 000` und `failOn: "error"`, Uploads höchstens 20 MB, keine SVG. Ein Bild mit 100 Megapixeln braucht beim Dekodieren etwa 300 bis 400 MB; bei mehreren gleichzeitig kann der Worker an die Speichergrenze kommen (der Job schlägt dann fehl, die Plattform läuft weiter). Ein Virenscan fehlt (Entscheid 0011, «Malware-Prüfung»): Eine präparierte Datei könnte eine Lücke in libvips, libheif oder libjpeg im Worker ausnutzen. Der Worker hat keinen öffentlichen Port.

### B-17 bis B-22 (Info)

- **B-17:** Bestätigungs- und Rücksetz-Links liegen als Job-Daten 24 Stunden (erfolgreich) beziehungsweise 7 Tage (fehlgeschlagen) in Redis. Die Token selbst laufen nach 1 Stunde (Rücksetzen) und 24 Stunden (Bestätigung) ab und gelten nur einmal.
- **B-18:** `style-src-attr 'unsafe-inline'` braucht Radix für Positionen; Skripte sind nicht betroffen (`script-src` mit Nonce und `strict-dynamic`). HSTS ohne `preload`; vor einem Eintrag in die Preload-Liste müssen alle Subdomains HTTPS können.
- **B-19:** Railway setzt `X-Real-IP` am Rand und überschreibt einen Wert des Clients. Geprüft am 18.11.2026 auf Staging: sieben Anmeldeversuche mit demselben gefälschten `X-Real-IP: 203.0.113.77` ergaben keine 429, obwohl die Grenze bei 5 liegt; die HTTP-Logs von Railway zeigen für dieselben Anfragen wechselnde echte Quelladressen. Der Wert des Clients kommt also nicht an. `x-forwarded-for` wird bewusst nicht verwendet. Grenze der Probe: Der ausgehende Proxy dieser Umgebung wechselt die Adresse, deshalb liess sich die Gegenprobe (Sperre bei gleicher echter Adresse) von hier nicht machen; lokal deckt sie `server.integration.test.ts` ab.
- **B-20:** Verschlüsselte Sicherungen (Entscheid 0024) behalten Monatsstände 12 Monate. Ein gelöschtes Konto ist so lange in Sicherungen enthalten. Das ist üblich und zulässig, muss aber in der Datenschutzerklärung stehen; ein Restore darf gelöschte Konten nicht wieder lebendig machen (Löschliste nach dem Restore erneut anwenden).
- **B-21:** `picomatch` ≤ 4.0.7 (ReDoS, kein Patch erschienen) und `esbuild` 0.27 (Dateizugriff nur beim Dev-Server unter Windows) stecken nur in Werkzeugen für Entwicklung und Tests.
- **B-22:** Nach der endgültigen Löschung bleiben: Supportanfragen mit Adresse und Text (`userId` ohne Fremdschlüssel), Terminanfragen des Mitglieds bei Anbietern (`memberUserId` ohne Fremdschlüssel), Meldungen des Kontos (Melder wird `null`, Text bleibt) und Meldungen gegen das Konto samt Beweiskopien, Audit-Einträge mit der Konto-ID. Ob und wie lange das bleiben darf, gehört zu B-05.

## 4. Geprüft ohne Befund

### Authentifizierung und Sitzung

- Passwort 12 bis 128 Zeichen, bestätigte Adresse ist Pflicht, Rücksetz-Link 1 Stunde, alle Sitzungen enden beim Zurücksetzen.
- Öffentliche Pfade `/sign-up/email`, `/update-user`, `/delete-user`, `/change-email` sind abgeschaltet; Registrierung nur über die Server Action mit Alters- und Zustimmungsprüfung.
- Kontenaufzählung: Registrierung antwortet gleich (B-07 für die Zeit), Zurücksetzen und erneuter Versand antworten gleich (Better Auth), die Anmeldung meldet «nicht bestätigt» nur mit richtigem Passwort.
- Gesperrte Konten: `databaseHooks.session.create.before` verweigert jede neue Sitzung (Passwort, zweiter Faktor, Passkey). `restrictAccount` löscht die Sitzungen in Postgres und in Redis (`revokeCachedSessions`); `revoked-sessions-before-<id>` verwirft jede ältere Sitzung auch dann, wenn ihr Token unbekannt war. Better Auth 1.7.25 liest genau diesen Schlüssel (`isRevokedSession`). Kein Cookie-Cache, jede Anfrage liest die Sitzung.
- Admin: `hasPermission` verlangt Rolle **und** `twoFactorEnabled`; Rechte pro Bereich in `packages/core/src/admin/permissions.ts`, geprüft in jeder Kernfunktion.

### Autorisierung: Route Handler

| Route | Prüfung |
| --- | --- |
| `/api/auth/[...all]` | Better Auth (Origin-Prüfung gegen `APP_URL`, Rate Limits) |
| `/api/health` | öffentlich, nur «ok» oder «unavailable» |
| `/api/konto/export` | Sitzung, Rate Limit 3 pro Stunde, Eintrag `DATA_EXPORTED` |
| `/api/nachrichten/bilder/[id]` | Sitzung; `attachmentDownloadUrl` prüft Beteiligung, Status, ausgeblendet oder gelöscht; sonst 404 |
| `/api/realtime/token` | Sitzung, POST |
| `/api/storage/object/[token]`, `/api/storage/upload/[token]` | nur Treiber fs und nicht in `production`; HMAC-Token mit Zweck, Bucket, Schlüssel, Typ, Grösse, Ablauf |
| `/api/suche/anzahl`, `/api/suche/vorschlaege` | Rate Limit pro Adresse, Altersbestätigung, dieselben Regeln wie die Suche |
| `/media/[id]/[variante]` | `resolveMediaDelivery`: öffentlich nur freigegeben und Profil sichtbar; «Mitglieder», Eigentümer und Organisation geprüft; sonst 404 |
| `/media/review/[id]/[variante]` | Prüfrolle mit zweitem Faktor, nur Medien in Prüfung |
| `/media/case/[id]/[variante]` | Recht `moderation.cases`, kritische Fälle nur Trust & Safety, Audit `report.media_previewed` |

### Autorisierung: Server Actions

Alle 56 Dateien mit `"use server"` holen die Sitzung über `getViewer()` (direkt oder über einen Wächter: `adminAction`, `mutatingAccount`, `messagingAccount`, `ownProviderUserId`, `mediaActor`, `actorId` der Organisation) und geben nur die Konto-ID an den Kern. Kein Aufruf vertraut einer ID des Besitzers aus dem Browser.

| Bereich | Wächter in `apps/web` | Prüfung im Kern |
| --- | --- | --- |
| Admin (Kategorien, Inhalte, Regionen, SEO, Support, System, Benutzer) | `adminAction` (angemeldet) | `assertPermission` mit dem Recht des Bereichs |
| Moderation, Medienprüfung, Verifizierung, Organisationen, Bewertungen | `getViewer` | `assertPermission`, `assertModerator`, `assertReviewer` (Rolle und zweiter Faktor); kritische Fälle `moderation.critical` |
| Nachrichten, Anhänge, Labels, Notizen, Blockieren, Melden | `messagingAccount` mit Rate Limit | Beteiligung an der Unterhaltung (`participantOf`), Labels nur eigene und nur Anbieterseite |
| Termine, Kalender | `getViewer`, `ownProviderUserId` | nur eigene Anfragen und eigenes Profil |
| Favoriten, Sammlungen, gespeicherte Suchen | `mutatingAccount` mit Rate Limit | `collection: { userId }`, `getOwnCollection` |
| Medien | `mediaActor` | Eigentum; bei `org` das Recht `media.edit` der Organisation |
| Organisation (Profil, Standorte, Zeiten, Einladungen) | `actorId` | `writable(userId, slug)` und `ownLocation` |
| Profil, Onboarding, Identitätsprüfung | `ownProviderUserId` | nur das Profil des Kontos; Testergebnis nur ausserhalb `production` und nur für die eigene Prüfung |
| Konto, Einstellungen, Altersbestätigung | `getViewer` | nur das eigene Konto |
| `/kontakt`, `/melden` | ohne Konto, Rate Limit pro Adresse, Bot-Feld | Eingaben geprüft; `/melden` nur Adressen dieser Plattform |

Kernfunktionen ohne eigene Prüfung sind interne Bausteine, die nur aus geprüften Funktionen aufgerufen werden: `blockContent` (aus `fileReport` und `decideCase`), `liftRestrictionsOfReport` (aus `decideCaseAppeal`), `decideChangeReview` (aus `decideReview`).

### Eingaben und Browser

- **SSRF:** Kein serverseitiges `fetch` mit Adressen aus Eingaben. `/melden` zerlegt die Adresse nur (`platformPath`) und nimmt nur Hosts dieser Plattform an.
- **Rückleitungen:** `safeReturnPath` erlaubt nur Pfade (`/…`, nicht `//`, kein `\`, keine Steuerzeichen); `callbackURL` und `redirectTo` prüft Better Auth gegen `APP_URL`. Der kanonische Host leitet immer auf `APP_URL` um.
- **Pfade:** Treiber fs erlaubt nur `[A-Za-z0-9_.-]` in Segmenten, kein `.` oder `..`, und prüft, dass der Pfad im Bucket bleibt.
- **Uploads:** JPEG, PNG, WebP, HEIC bis 20 MB; die presigned URL signiert Typ und genaue Länge; der Worker erkennt den Typ am Inhalt, kodiert neu und entfernt EXIF und GPS. Chat-Bilder ebenso, höchstens 1600 px.
- **XSS:** Kein `dangerouslySetInnerHTML`. Der Markdown-Leser des CMS kennt kein HTML und erlaubt nur `https:`, `http:`, `mailto:` und eigene Pfade als Links.
- **CSP:** Nonce pro Anfrage, `strict-dynamic`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. Weitere Kopfzeilen: HSTS 2 Jahre mit Subdomains, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (Kamera, Mikrofon, Zahlung aus), neu COOP. Auf Staging bestätigt.
- **CSRF:** Server Actions prüfen `Origin` gegen den Host (Next.js, keine `allowedOrigins`); Better Auth prüft `Origin` gegen `APP_URL`; Cookies `SameSite=Lax`.

### Echtzeit, Protokolle, Geheimnisse

- Echtzeit: HMAC-Token mit 60 Sekunden Gültigkeit, `maxPayload` 1 KB, Ereignisse tragen nur `{ type: "conversation", conversationId }`.
- Protokolle: Der Logger nimmt nur einfache Werte an; alle Aufrufe geben Ereignisnamen, IDs, Zahlen und Fehlernamen (`error.name`), keine Inhalte, Adressen oder Token. Rate-Limit-Schlüssel sind gehasht.
- Audit-Log ohne Inhalte: Aufdecken von Nachrichten und Ausweisdaten schreibt Grund und Ziel, keine Kopie (Tests in `cases.integration.test.ts`, `moderation.integration.test.ts`).
- Geheimnisse: Im Repository liegt nur `.env.example` ohne Werte; `.env` und `.env.local` sind in `.gitignore`. Die Git-Historie enthält keine Schlüssel, Datenbank-URLs mit Passwort oder privaten Schlüssel.

### Notfall-Sperrungen (v1 20.7)

Möglich und getestet; Ablauf in `docs/security/datenschutz-und-sicherheit.md`, Abschnitt 7.

## 5. Änderungen dieser Prüfung

| Datei | Änderung |
| --- | --- |
| `packages/core/src/moderation/intake.ts` | B-01 |
| `packages/core/src/moderation/cases.integration.test.ts` | Konten der Tests 30 Tage alt; neuer Test B-01 |
| `packages/core/src/account/export.ts`, `export.integration.test.ts` | B-02 |
| `packages/core/src/media/purge-storage.ts`, `purge-storage.integration.test.ts`, `packages/core/src/retention/purge.ts` | B-03 |
| `packages/auth/src/server.ts`, `server.integration.test.ts` | B-04, B-10, B-11 |
| `apps/web/features/account/actions/register.ts` | B-07 |
| `apps/realtime/src/server.ts`, `index.ts`, `server.test.ts` | B-08 |
| `apps/web/next.config.ts` | B-12 |

Ergebnisse: siehe Übergabe dieses Schritts (Tests in `packages/core`, `packages/auth`, `apps/realtime`, `apps/web`).

## 6. Restrisiken

1. **Kein externer Test.** Siehe Abschnitt 7.
2. **Kein Prüfdienstleister für Identität.** In der Produktion kann deshalb niemand verifiziert werden, und kein Profil wird öffentlich (Entscheid 0009). Mit der Anbindung kommen ein Webhook und Personendaten eines Dritten dazu; beides muss vor dem Start geprüft werden.
3. **Missbrauch der Meldewege** (B-01): ältere Konten können weiterhin wenige Profile sofort sperren; Gegenmittel ist eine schnelle Entscheidung durch Trust & Safety.
4. **Aufbewahrung** (B-05, B-22): Viele Daten bleiben unbegrenzt, bis Fristen entschieden sind.
5. **Verteilte Angriffe** auf Rate Limits (B-14) und Decoder (B-16).
6. **Abhängigkeiten** (B-06): `nodemailer` ist auf 10.6.0; die Ausnahme für picomatch entfernen, sobald eine behobene Version erscheint.
7. **Betreiberrechte:** Railway sieht Datenbank, Buckets und Variablen (Verschlüsselung im Ruhezustand mit Schlüsseln von Railway). Die Plattform hat keine eigene Verschlüsselung auf Feldebene; Nachrichten und Ausweisergebnisse liegen im Klartext in Postgres. Die Sicherungen sind dagegen mit eigenem Schlüssel verschlüsselt (Entscheid 0024).
8. **Konto `SUPER_ADMIN`:** Ein übernommenes Konto mit dieser Rolle kann alles, auch andere Admins sperren. Schutz: zweiter Faktor, Passkey mit PIN (B-04). Ein Notfall ohne zweites `SUPER_ADMIN`-Konto braucht den Weg über die Datenbank (Abschnitt 7 der Datenschutzdokumentation).

## 7. Empfehlung: externer Penetrationstest

**Vereinbart am 18.11.2026:** Die Betreiberin lässt den externen Penetrationstest vor dem öffentlichen Start durchführen und klärt die Aufbewahrungsfristen (B-05) mit der rechtlichen Beratung im Rahmen der Datenschutz-Folgenabschätzung.

Vor dem öffentlichen Start (v1 20.7, v2 16.2), durch eine unabhängige Firma, gegen `staging` mit Produktionskonfiguration (gleiche Variablen ausser Geheimnissen, `APP_ENV=staging`, Treiber s3, Resend oder Ausgang).

**Umfang:**

1. **Web-Anwendung** `staging.thegnd.net`, grau (mit Testkonten jeder Rolle: Besucher, Mitglied, Anbieter, Organisation als Inhaber und als Mitglied, Support, Moderation, Trust & Safety, Plattform-Admin, Super-Admin) nach OWASP ASVS Stufe 2: Anmeldung, 2FA, Passkeys, Zurücksetzen, Sitzungen, Sperren.
2. **Autorisierung auf Objektebene** über alle Rollen: Nachrichten und Anhänge, Termine, Bewertungen, Medien (öffentlich, Mitglieder, in Prüfung, gemeldet), Organisationen und verknüpfte Anbieter (PRD 16.1: keine Einsicht in Nachrichten, Ausweisdaten, private Kalender), Admin-Bereiche, Datenexport.
3. **Missbrauch:** Meldewege (`/melden`, Meldungen aus Konten, Sofortsperre), Massenregistrierung, Rate Limits, Spam über Nachrichten, Einladungen und `/kontakt`.
4. **Uploads und Worker:** präparierte Bilder (Decoder, Dekompressionsbomben, Polyglotte), Umgehung der presigned URLs, CORS der Buckets.
5. **Echtzeit-Dienst** `wss://realtime-staging.thegnd.net`: Token, Origin, Verbindungsflut.
6. **Infrastruktur von aussen:** TLS, Kopfzeilen, offene Ports und Dienste der Railway-Domains, Buckets ohne Signatur, Subdomain-Übernahme der DNS-Einträge.
7. **Konfiguration auf Railway** (mit Lesezugriff): Variablen, Netzwerk, wer Zugriff auf Projekt und Workspace hat.

**Ergebnis:** Bericht mit Stufen nach CVSS, Nachtest nach den Korrekturen, Bestätigung für die Abnahme 20.7.
