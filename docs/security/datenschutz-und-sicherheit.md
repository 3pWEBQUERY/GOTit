# Datenschutz- und Sicherheitsdokumentation

**Stand:** 18.11.2026 (Schritt 1.14) · **Grundlage:** PRD v1.0 Abschnitte 10 und 20.7, PRD v2.0 Abschnitt 16, Entscheide in `docs/decisions/`, Betrieb in `docs/railway.md` · **Prüfung:** `docs/security/sicherheitspruefung-1.14.md`

Diese Dokumentation beschreibt, was der Code heute tut. Sie ersetzt weder die Datenschutz-Folgenabschätzung nach revDSG (Gate 16.3) noch die Datenschutzerklärung; beide schreiben Fachpersonen. Wo etwas nicht entschieden oder nicht geprüft ist, steht das ausdrücklich da.

## 1. Grundsätze im Code

- **Datensparsamkeit:** Keine Kopie von Ausweisdokumenten (PRD 16.1), kein Geburtsdatum bei der Altersbestätigung (Entscheid 0002), Statistik ohne Besucher-ID, IP-Adresse oder Konto (Entscheid 0019), Bilder ohne EXIF und GPS (Entscheide 0011, 0014).
- **Autorisierung im Kern:** Jede Funktion in `packages/core` prüft Rolle, Eigentum oder Beteiligung selbst; die Oberfläche übergibt nur die Konto-ID der Sitzung. Fremde Objekte verhalten sich wie unbekannte (404).
- **Keine Inhalte in Protokollen:** Der Logger (`packages/core/src/observability/logger.ts`) nimmt nur einfache Werte an; protokolliert werden Ereignisnamen, IDs, Zahlen und Fehlernamen.
- **Keine Weitergabe an KI- oder Übersetzungsdienste:** Private Nachrichten verlassen die Plattform nicht (PRD 16.2); es gibt keine solche Anbindung.
- **Keine falschen Versprechen:** Keine Ende-zu-Ende-Verschlüsselung, die Plattform behauptet sie auch nicht (Entscheid 0014).

## 2. Datenbestand pro Modul

«Zugriff» meint Personen; der Kern prüft das in jeder Funktion. Interne Rollen brauchen immer den zweiten Faktor. «Kaskade» heisst: Die Daten verschwinden mit der endgültigen Löschung des Kontos (30 Tage nach dem Antrag, Cron-Dienst `cron-purge-expired`).

| Modul | Personendaten | Ablage | Aufbewahrung | Zugriff |
| --- | --- | --- | --- | --- |
| Konto (`auth`, `account`) | Name, Benutzername, E-Mail, Passwort-Hash, 2FA-Geheimnis, Passkeys, Kontotyp, Zeitpunkt der Altersbestätigung, Einstellungen | Postgres | Kaskade | die Person; Admin mit `users.view` (ohne Hash und Geheimnisse) |
| Sitzungen | Token, Ablauf, Gerät (User-Agent), IP-Adresse laut Better Auth | Postgres und Redis | 30 Tage ab letzter Verlängerung; Kaskade | die Person (Liste, Beenden) |
| Sicherheitsprotokoll | Ereignis (Anmeldung, Passwort, 2FA, Passkey, Export), Gerät | Postgres | 365 Tage | die Person |
| Zustimmungen | Art, Version, Zeitpunkt | Postgres | Kaskade | die Person |
| Altersbestätigung Besucher | signiertes Cookie ohne Personendaten | Browser | höchstens 24 Stunden | – |
| Region | Kürzel der gewählten Region | Cookie im Browser | 365 Tage | – |
| Identitätsprüfung | Dienstleister, Status, über 18, Lebendigkeit, Zeitpunkt, Ablauf, Fehlergrund, Referenz beim Dienstleister; keine Dokumente | Postgres | Kaskade; sonst ohne Frist | die Person (Ergebnis); Prüfrolle; Aufdecken der Details mit Grund und Audit-Eintrag |
| Anbieterprofil | Anzeigename, Beschreibung, Sprachen, Regionen, Leistungen, Preise, Ortsangabe (keine genaue Adresse, PRD 16.1), Status | Postgres, Suchindex | Kaskade | öffentlich, wenn freigegeben; Prüfrolle |
| Medien | Fotos (neu kodiert, ohne Metadaten), Alternativtext, Sichtbarkeit | Bucket «originals» (privat), Bucket «derivatives», Postgres | Löschen durch die Person: sofort per Job; Kaskade inklusive Dateien (seit 1.14) | öffentlich oder nur Mitglieder nach Wahl; Eigentümer; Prüfrolle; Moderation bei Meldung (mit Audit) |
| Kalender, Termine | Verfügbarkeit, Sperrzeiten, Anfragen mit Zeitraum, Nachricht, Notiz des Anbieters | Postgres | Anbieterseite: Kaskade. Anfragen eines gelöschten Mitglieds bleiben beim Anbieter (ohne Konto) | die beiden Beteiligten; Organisationen nie (Entscheid 0018) |
| Nachrichten | Texte, Chat-Bilder (WebP, ohne EXIF), Lesestand, Labels und Notizen der Anbieterseite, Blockierungen | Postgres, Bucket «originals» unter `chat/` | Kaskade; Unterhaltungen mit nur einer Seite werden entfernt; nie gesendete Bilder nach 24 Stunden | nur die Beteiligten; Moderation nur bei einer Meldung, verdeckt bis zum Aufdecken mit Grund und Audit |
| Favoriten, gespeicherte Suchen | Sammlungen, Profile, Suchfilter | Postgres | Kaskade | die Person |
| Bewertungen | Punkte, Text, Stellungnahme des Anbieters | Postgres | Kaskade | öffentlich, wenn freigegeben; Moderation |
| Meldungen | Melder (oder Kontaktadresse ohne Konto), Ziel, Grund, Text, Kopie der gemeldeten Nachrichten | Postgres | ohne Frist; Melder wird bei Löschung `null` | Moderation, Trust & Safety, Plattform-Admin; Kopie erst nach Aufdecken mit Grund |
| Einschränkungen und Sperren | Art, Regel, Begründung, Ende, Einspruch | Postgres | Kaskade | die Person; `users.restrict`, `users.suspend` |
| Organisationen | Name, Art, Standorte, Öffnungszeiten, Mitglieder und Rollen, Verknüpfungen | Postgres | ohne Frist | Mitglieder nach Recht; öffentlich, wenn veröffentlicht; Prüfrolle |
| Support | E-Mail, Betreff, Text, Antworten, interne Notizen | Postgres | ohne Frist; bleibt nach der Löschung des Kontos | Support, Plattform-Admin |
| Statistik | Ereignisse pro Profil, Art, Zeit, Medium, Filterschlüssel; keine Besucherdaten | Postgres | Rohereignisse 3 Tage nach der Aggregation; Tageszahlen ohne Frist | der Anbieter |
| Audit-Log | Wer (Konto-ID), was, Ziel, Begründung; keine Inhalte | Postgres | ohne Frist | `audit.view` (Plattform-Admin, Trust & Safety) |
| E-Mail | Empfänger, Vorlage, Link | Redis (Jobs), Resend | Jobs 24 Stunden (fehlgeschlagen 7 Tage); bei Resend nach deren Bedingungen | Worker |
| Rate Limits | Zähler mit gehashtem Schlüssel aus Adresse und E-Mail | Redis | Länge des Fensters (höchstens 1 Stunde) | – |
| Sicherungen | vollständiger Dump der Datenbank | Bucket `backups`, mit age verschlüsselt; Volume-Backups bei Railway | 14 Tage, 8 Wochen, 12 Monate (Entscheid 0024) | Halter des privaten Schlüssels |

## 3. Verschlüsselung

- **Übertragung:** Alle öffentlichen Adressen nur über HTTPS (Railway am Rand, HSTS 2 Jahre mit Subdomains); der Echtzeit-Dienst über `wss://`. Zwischen den Diensten läuft der Verkehr im privaten Netz von Railway, laut Railway-Dokumentation über WireGuard verschlüsselt. E-Mails gehen über die HTTPS-API von Resend.
- **Ruhezustand:** Laut Railway-Dokumentation («Enterprise > Security», abgefragt am 18.11.2026) verschlüsselt Railway alle gespeicherten Daten mit AES-256: Volumes (Postgres, Redis), Volume-Backups, Point-in-Time-Archive, Buckets und Variablen. Die Schlüssel verwaltet Railway; Railway kann die Daten also lesen.
- **Eigene Verschlüsselung:** Nur die Sicherungen in `backups` sind mit einem Schlüssel verschlüsselt, den Railway nie sieht (age, Entscheid 0024). Auf Feldebene gibt es keine eigene Verschlüsselung; Nachrichten und Prüfergebnisse liegen in Postgres im Klartext.
- **Passwörter:** Hash von Better Auth (scrypt). 2FA-Geheimnisse und Ersatzcodes speichert Better Auth verschlüsselt mit `BETTER_AUTH_SECRET`.
- **Signaturen:** Cookies und Token (Sitzung, Altersbestätigung, Echtzeit, Speicher-Token des Treibers fs) sind mit HMAC-SHA-256 signiert; die Geheimnisse sind pro Umgebung getrennt und mindestens 32 Zeichen lang.

## 4. Zugriffsmodell

- **Konten:** Besucher (ohne Konto, nur öffentliche Inhalte nach Altersbestätigung), Mitglied, Anbieter, Organisation (Rollen Inhaber, Standortmanager, Marketing und Redaktion, Terminorganisation; Entscheid 0018). Organisationen haben nie Zugriff auf Nachrichten, Ausweisdaten, Anfragen oder private Kalender verknüpfter Anbieter.
- **Interne Rollen** (Entscheid 0020, `packages/core/src/admin/permissions.ts`): `SUPER_ADMIN` (alles), `PLATFORM_ADMIN`, `MODERATOR`, `TRUST_SAFETY`, `SUPPORT`, `FINANCE`, `CONTENT_EDITOR`. Rechte sind einzeln definiert, zum Beispiel `users.suspend` nur Plattform-Admin und Trust & Safety, `moderation.critical` nur Trust & Safety, `roles.manage` nur Super-Admin. Ohne zweiten Faktor hat eine Rolle keine Wirkung. Die erste Rolle einer Umgebung vergibt die Kommandozeile (`pnpm --filter @app/db grant-role`, Entscheid 0009).
- **Anmeldung:** Passwort ab 12 Zeichen mit bestätigter Adresse, optional TOTP mit Ersatzcodes, Passkeys mit Pflicht zur Benutzerverifikation. Sitzungen 30 Tage in `HttpOnly`-, `Secure`-, `SameSite=Lax`-Cookies, nur für den Host von `APP_URL`.
- **Schutz vor Missbrauch:** Rate Limits pro Adresse und Konto (`packages/core/src/rate-limit/limiter.ts`, dazu die Regeln in `packages/auth/src/server.ts`); die Adresse liefert Railway in `x-real-ip`.

## 5. Protokollierung und Audit

- **Betriebslogs** (Railway): JSON mit Dienst, Ereignis, Zeit und einfachen Feldern. Keine Nachrichtentexte, Ausweisdaten, Suchbegriffe, E-Mail-Adressen oder Token. Fehler nur mit `error.name`. Railway speichert zusätzlich HTTP-Logs mit Pfad, Status und Quelladresse.
- **Sicherheitsprotokoll des Kontos** (`security_event`): für die Person sichtbar, 365 Tage.
- **Audit-Log** (`audit_event`): jeder Entscheid der Moderation und Prüfung, jede Einschränkung und Sperre, jede Rollen-, Flag-, Regionen- und Inhaltsänderung, jedes Aufdecken von Nachrichten oder Ausweisdetails, jede Vorschau eines gemeldeten Mediums, automatische Eskalationen und Sofortsperren. Immer ohne Kopie des Inhalts (PRD 16.2). Einsicht unter `/admin/system/audit` mit `audit.view`.

## 6. Rechte der betroffenen Personen

- **Auskunft:** `/einstellungen` → Daten → Export (`/api/konto/export`), JSON mit allen Daten des Kontos (seit 1.14 alle Module, Format `gotit-account-export/2`), höchstens 3 pro Stunde, im Sicherheitsprotokoll vermerkt. Nicht enthalten: Daten Dritter und interne Angaben der Moderation.
- **Berichtigung:** Profil und Konto in den Einstellungen und im Studio. Kritische Felder eines Anbieterprofils gehen vorher in die Prüfung.
- **Löschung:** «Konto löschen» deaktiviert sofort, beendet alle Sitzungen und löscht nach 30 Tagen endgültig; eine Anmeldung in der Frist bricht ab. Danach entfernt der Cron-Dienst Chat-Bilder und Mediendateien aus den Buckets und das Konto samt Kaskade. Was bleibt, steht in Abschnitt 8.
- **Pausieren:** Anbieter nehmen ihr Profil selbst sofort offline (v1 10.3 «Schnelle Pausierung eines Profils»).

## 7. Vorfälle und Notfall-Sperrungen (v1 20.7)

### 7.1 Ein Konto oder Profil sofort offline nehmen

Wer: Plattform-Admin, Trust & Safety oder Super-Admin, jeweils mit zweitem Faktor.

1. `/admin/benutzer` → Konto suchen → Konto öffnen → «Konto sperren». Regel und Begründung angeben, Ende leer lassen (unbefristet).
2. Wirkung sofort und in einer Transaktion: Profil auf `SUSPENDED` (nicht mehr öffentlich, die Suche prüft den Status bei jeder Abfrage), alle Sitzungen in Postgres und Redis beendet, neue Anmeldungen verweigert (auch nach zweitem Faktor und mit Passkey), Audit-Eintrag `account.restricted.suspended`.
3. Konten mit interner Rolle sperrt nur ein Super-Admin.

Test: `packages/core/src/moderation/cases.integration.test.ts` und `apps/web/e2e/moderation-member.spec.ts` («ein gesperrtes Konto meldet sich nicht an»).

### 7.2 Einzelne Inhalte sperren

- Eine Meldung im Fall unter `/admin/moderation/[fall]` mit «Entfernen» entscheiden: Nachricht für beide Seiten ausgeblendet, Bewertung entfernt, Medium gesperrt, Profil oder Organisation gesperrt. Kritische Fälle entscheidet Trust & Safety.
- Kritische Meldungen aus Konten sperren den Inhalt beim Eingang selbst (seit 1.14 nur aus bestätigten Konten, die mindestens 7 Tage alt sind, höchstens 3 pro Tag und Konto); `/melden` ohne Konto eskaliert, sperrt aber nicht.
- Öffentliche Medien können bis zu 10 Minuten in Browser- und CDN-Caches bleiben (Entscheid 0011).

### 7.3 Eine Region oder einen Bereich abschalten

- `/admin/regionen`: Freigabe einer Region zurückziehen (Recht `regions.manage`); bei einem Kanton verlieren auch seine Städte die Freigabe. Die Region verschwindet aus Suche und Filtern.
- `/admin/system/flags`: Phasen-Funktionen (`community`, `business-suite`) global oder pro Region aus. Für Phase 1 gibt es kein Flag, das den Marktplatz abschaltet.
- `/admin/kategorien`: Freigabe einer Kategorie zurückziehen.

### 7.4 Wenn die Admin-Oberfläche nicht reicht

- **Übernommenes Admin-Konto:** Ein Super-Admin sperrt es (7.1). Ohne zweites Super-Admin-Konto: in der Datenbank die Rolle entfernen (`delete from internal_role_assignment where "userId" = …`) und die Sitzungen löschen (`delete from session where "userId" = …`), danach in Redis `auth:revoked-sessions-before-<userId>` auf die aktuelle Zeit in Millisekunden setzen. Jeder Eingriff von Hand gehört ins Vorfallprotokoll.
- **Ganze Plattform offline:** Dienst `web` auf Railway anhalten oder auf null Instanzen setzen; der Echtzeit-Dienst liefert ohne `web` nichts Neues.
- **Geheimnis offengelegt:** `BETTER_AUTH_SECRET` neu setzen macht alle Sitzungs-Cookies und Token ungültig, **aber auch die damit verschlüsselten 2FA-Geheimnisse und Ersatzcodes unlesbar**: Alle Konten mit 2FA, auch die Admins, kämen nicht mehr an. Vorher klären, wie 2FA neu eingerichtet wird (Better Auth kennt dafür eine Liste früherer Geheimnisse; nicht geprüft). Nur Sitzungen beenden geht ohne Wechsel: `delete from session` und Redis-Schlüssel `auth:*` der Sitzungen löschen. `AGE_GATE_SECRET` neu setzen verlangt die Altersbestätigung neu; Zugangsdaten eines Buckets in Railway neu erzeugen; `RESEND_API_KEY` bei Resend widerrufen.

### 7.5 Vorfallablauf

1. **Erkennen:** Meldung, Support, Logs auf Railway, Fehler von Diensten.
2. **Eindämmen:** Massnahmen aus 7.1 bis 7.4.
3. **Sichern:** Audit-Log und Railway-Logs exportieren, bevor sie ablaufen; keine Inhalte ausserhalb der Plattform kopieren.
4. **Bewerten:** Welche Daten, wie viele Personen, seit wann.
5. **Melden:** Nach revDSG Art. 24 meldet die Verantwortliche eine Verletzung der Datensicherheit, die voraussichtlich zu einem hohen Risiko führt, so rasch als möglich dem EDÖB und informiert bei Bedarf die Betroffenen. Bei Hinweisen auf Minderjährige, Menschenhandel oder akute Gefahr: Polizei (117) und Fachstellen nach dem Moderationskonzept (Gate 16.3, noch offen).
6. **Nacharbeit:** Ursache beheben, Test ergänzen, Eintrag in `docs/decisions/`.

Verantwortliche Personen, Erreichbarkeit und Fristen der Moderation sind organisatorisch und noch nicht festgelegt (Gate 16.3 «Moderationskonzept mit Besetzung, Reaktionszeiten und Eskalationsweg»).

## 8. Aufbewahrung: offene Fristen

`packages/core/src/retention/policy.ts` setzt heute: Löschfrist des Kontos 30 Tage, Sicherheitsprotokoll 365 Tage, E-Mail-Ausgang 7 Tage, abgelaufene Token 1 Tag; dazu Statistik und Chat-Bilder wie oben. PRD 16.2 verlangt eine Frist für **jede** Datenklasse. Zu entscheiden (Datenschutz-Folgenabschätzung, Fachperson):

| Datenklasse | Heute | Zu entscheiden |
| --- | --- | --- |
| Audit-Log | unbegrenzt | Frist, zum Beispiel 2 bis 10 Jahre je nach Beweiszweck |
| Meldungen samt Kopien | unbegrenzt | Frist nach dem Entscheid; längere Frist bei Straftatverdacht |
| Supportanfragen | unbegrenzt, auch nach der Kontolöschung | Frist nach dem Abschluss |
| Terminanfragen eines gelöschten Mitglieds | bleiben beim Anbieter | löschen oder anonymisieren |
| Nachrichten aktiver Konten | unbegrenzt | Frist für ruhende Unterhaltungen |
| Prüfergebnisse der Identität | bis zur Löschung | Frist nach Ablauf der Prüfung, Pflichten aus Gate 16.3 |
| Abgeschlossene Einschränkungen | bis zur Löschung | Frist nach dem Aufheben |
| Tageszahlen der Statistik | unbegrenzt | keine Personendaten Dritter; Frist optional |
| Sicherungen | bis 12 Monate | festhalten in der Datenschutzerklärung; nach einem Restore die Löschungen seit der Sicherung erneut anwenden |

## 9. Sicherungen

Siehe `docs/decisions/0024-backups.md`. Kurz: Railway-Volume-Backups (täglich 6, wöchentlich 27, monatlich 89 Tage; im Dashboard einzuschalten) und täglich ein mit age verschlüsselter Dump in den Bucket `backups` (14 Tage, 8 Wochen, 12 Monate). Den privaten Schlüssel halten die Inhaberin oder der Inhaber und eine benannte Stellvertretung offline; er liegt nie auf Railway, in GitHub oder in der `.env`. Der Restore ist dort beschrieben; v1 20.7 verlangt, dass er getestet ist.

## 10. Auftragsbearbeiter

| Anbieter | Zweck | Daten | Ort | Stand |
| --- | --- | --- | --- | --- |
| Railway | Hosting aller Dienste, Postgres, Redis, Buckets, Logs | alle | EU: Dienste und Volumes `europe-west4` (Amsterdam), Buckets `ams` (docs/railway.md) | Schriftliche Bestätigung der Zulässigkeit der Inhalte offen (Gate 16.3); Vertrag zur Auftragsbearbeitung prüfen |
| Resend | Versand der E-Mails (Bestätigung, Zurücksetzen, Termine, Support) | E-Mail-Adresse, Inhalt der E-Mail | nicht geprüft | Nutzungsbedingungen für diese Branche nicht schriftlich geprüft (Entscheid 0015); Datenstandort und Vertrag prüfen |
| Prüfdienstleister Identität | Alters- und Identitätsprüfung | Ausweis, Lebendigkeit beim Dienstleister; bei uns nur das Ergebnis | – | noch nicht gewählt (Gate 16.3, Entscheid 0009) |
| GitHub | Quellcode, CI | keine Personendaten (Tests mit fiktiven Daten) | – | – |

Daten liegen in der EU, nicht in der Schweiz; das ist Teil der Datenschutz-Folgenabschätzung (Gate 16.3).

## 11. Offene rechtliche und organisatorische Punkte

1. Datenschutz-Folgenabschätzung nach revDSG (und DSGVO für die Expansion), inklusive Datenstandort EU (Gate 16.3, v1 10.4).
2. Aufbewahrungsfristen (Abschnitt 8).
3. Datenschutzerklärung und Nutzungsbedingungen (Inhalte unter `/admin/inhalte`), inklusive Sicherungen, Auftragsbearbeiter, Cookies, Rechte der Personen.
4. Verträge zur Auftragsbearbeitung mit Railway und Resend; Zulässigkeit der Branche bei beiden schriftlich (Gate 16.3).
5. Wahl und Anbindung des Prüfdienstleisters (Gate 16.3).
6. Moderationskonzept mit Besetzung, Reaktionszeiten (Vorschlag aus Entscheid 0020: kritische Fälle in 4 Stunden) und Eskalationsweg zu Behörden und Fachstellen (Gate 16.3).
7. Externer Penetrationstest vor dem Start (v1 20.7, v2 16.2); Umfang in `docs/security/sicherheitspruefung-1.14.md`, Abschnitt 7.
8. Getesteter Restore aus der Sicherung (v1 20.7, Entscheid 0024).
9. Benannte Verantwortliche für Vorfälle und Meldungen an den EDÖB (Abschnitt 7.5).
