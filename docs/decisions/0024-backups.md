# 0024 Datenbank-Sicherung und Restore (Schritt 1.14)

**Stand:** 18.11.2026

Grundlage: PRD v2.0 Abschnitt 14.2 («Postgres mit täglichen Backups und einem dokumentierten, getesteten Restore. Zusätzlich ein verschlüsselter Dump in einen dritten Bucket per Cron.») und PRD v1.0 Abschnitt 20.7 («Wiederherstellung aus Backup getestet»). Betrieb auf Railway: `docs/railway.md`.

## Zwei Schichten

1. **Volume-Backups von Railway** (erste Schicht, ohne Code). Laut Railway-Dokumentation (abgefragt am 18.11.2026, «Backups» und «Enterprise > Security»):
   - Backups des Volumes lassen sich von Hand anlegen oder täglich, wöchentlich und monatlich planen.
   - Aufbewahrung: täglich 6 Tage, wöchentlich 27 Tage, monatlich 89 Tage.
   - Ein Restore legt ein neues Volume an; das alte bleibt ungemountet im Projekt.
   - **Wird das Volume gelöscht («wipe»), sind auch alle seine Backups weg.** Deshalb reicht diese Schicht allein nicht.
   - Für Postgres gibt es zusätzlich Point-in-Time-Recovery (`railway postgres pitr`, Seite «Point-in-Time Recovery»). **Nicht geprüft:** ob PITR in unserem Tarif verfügbar ist und was es kostet.
   - **Zu tun im Dashboard:** am Dienst `Postgres` unter «Backups» den Zeitplan Täglich + Wöchentlich + Monatlich einschalten (in `production` und `staging`).
2. **Verschlüsselter Dump** in den Bucket `backups` (zweite Schicht, dieser Entscheid). Er liegt ausserhalb des Volumes, ist mit einem Schlüssel verschlüsselt, den Railway nie sieht, und überlebt das Löschen der Datenbank.

## Was und wann

- **Dienst** `cron-backup-database`, täglich **02:13 UTC**, Aufgabe `backup-database` (`apps/cron/src/tasks/backup-database.ts`, Logik in `apps/cron/src/backup/`).
- **Ablauf:**
  1. Eine Verbindung öffnet eine Transaktion `REPEATABLE READ READ ONLY` und exportiert ihren Snapshot (`pg_export_snapshot()`).
  2. Im selben Snapshot zählt sie die Zeilen jeder Tabelle (`count(*)`, alle Schemas ausser den System-Schemas) und liest die neueste Prisma-Migration.
  3. `pg_dump --format=custom --snapshot=…` läuft mit genau diesem Snapshot. Die Zahlen im Manifest gehören deshalb genau zu diesem Dump, auch wenn währenddessen geschrieben wird.
  4. Der Dump fliesst als Stream durch `age --encrypt` in eine Datei im Temp-Ordner (`BACKUP_TMP_DIR`, sonst `os.tmpdir()`), mit SHA-256 im Durchfluss. Im Speicher liegt nie der ganze Dump.
  5. Upload der Datei, danach das Manifest. **Ein Dump ohne Manifest gilt als unvollständig.**
  6. Aufbewahrung anwenden (siehe unten). Die neue Sicherung wird nie gelöscht.
- **Schlüssel:** `postgres/YYYY/MM/DD/YYYYMMDDTHHMMSSZ.dump.age` und daneben `….manifest.json` (UTC).
- **Manifest** (`gotit-postgres-backup/1`): Grösse und SHA-256 der verschlüsselten Datei, öffentliche age-Schlüssel, Version von `pg_dump` und Server, Datenbankname, Kennung des Clusters (`pg_control_system().system_identifier`), neueste Migration mit Anzahl, Zeilen pro Tabelle.
- **Passwort** der Datenbank geht über `PGPASSWORD` an `pg_dump`, nicht über die Befehlszeile.
- **Fehler:** Das Log enthält `backup_database_failed` mit der Meldung (ohne Zugangsdaten); der Dienst endet mit Exit 1, Railway zeigt den Lauf als fehlgeschlagen.

## Verschlüsselung: age

- **Öffentliche Schlüssel** in `BACKUP_AGE_RECIPIENTS` (kommagetrennt, `age1…`). Der private Schlüssel ist nie auf Railway.
- **Ohne gültigen Empfänger bricht die Aufgabe ab**, bevor sie die Datenbank öffnet. Unverschlüsselt wird nie hochgeladen; der Test prüft, dass im Bucket der Kopf `age-encryption.org/v1` steht und nicht `PGDMP`.
- **Warum die CLI und nicht das npm-Paket `age-encryption`:**
  - Für `pg_dump` 18 braucht der Dienst ohnehin ein eigenes Image (siehe unten); `age` ist dort ein Debian-Paket.
  - Die CLI ist die Referenz-Umsetzung, streamt nativ und ist dieselbe, mit der die Betreiberin entschlüsselt.
  - `age-encryption` (typage) ist eine 0.x-Bibliothek mit wechselnder API; **nicht geprüft**, ob die aktuelle Version Streams über Node zuverlässig kann. Eine weitere Abhängigkeit im Krypto-Pfad bringt hier keinen Vorteil.
- **Mehrere Empfänger:** Jede Sicherung lässt sich mit jedem der Schlüssel öffnen. Empfohlen sind zwei: Hauptschlüssel und Notfallschlüssel (siehe «Wer den Schlüssel hält»).

## Image: pg_dump 18

- Railway Postgres läuft mit **Version 18**. `pg_dump` muss mindestens die Hauptversion des Servers haben; die Aufgabe prüft das vorher und meldet «es braucht pg_dump ≥ 18».
- **Railpack reicht nicht:** `RAILPACK_DEPLOY_APT_PACKAGES=postgresql-client age` installiert das Paket der Debian-Version des Images. Debian bookworm hat `postgresql-client-15`, trixie `postgresql-client-17`; `postgresql-client-18` gibt es nur im Repository des PostgreSQL-Projekts (PGDG, `apt.postgresql.org`). Railpack nimmt nach unserem Kenntnisstand nur Paketnamen, keine fremden Apt-Repositories (**nicht geprüft**).
- **Deshalb ein Dockerfile nur für diesen Dienst:** `apps/cron/backup.Dockerfile`.
  - Basis `node:22-trixie-slim`. Darauf `postgresql-common` und `age` aus Debian.
  - Dann das PGDG-Repository mit dem mitgelieferten Skript `/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y` und `postgresql-client-18`.
  - Danach `pnpm install --filter "@app/cron..."` und der Build wie bei den anderen Cron-Diensten. Start: `node apps/cron/dist/index.js backup-database`.
  - Am Dienst: `RAILWAY_DOCKERFILE_PATH=apps/cron/backup.Dockerfile` (laut Doku «Custom Dockerfile path»).
- **Nicht geprüft** (aus dieser Umgebung kein Zugang zu den Debian- und PGDG-Spiegeln): die genauen Paketnamen in trixie und dass das Image so baut. Der Build bricht sichtbar ab, wenn `pg_dump --version` oder `age --version` fehlt. Erster Build auf Railway zeigt es; danach diesen Absatz als geprüft markieren.
- Die übrigen Cron-Dienste bleiben auf Railpack.

## Bucket `backups`

- Dritter Bucket, privat, in `ams` wie die anderen. Keine Lifecycle-Regeln (PRD 14.2), die Aufgabe räumt selbst auf.
- **Eigene Zugangsdaten** `S3_BACKUPS_BUCKET`, `S3_BACKUPS_ACCESS_KEY_ID`, `S3_BACKUPS_SECRET_ACCESS_KEY` (dazu die geteilten `S3_ENDPOINT`, `S3_REGION`, `S3_FORCE_PATH_STYLE`), nur am Dienst `cron-backup-database`.
- Bewusst **nicht** in `@app/storage` (`BUCKETS`): Dann müssten Web und Worker die Variablen kennen. Die Ablage liegt in `apps/cron/src/backup/store.ts`, mit Streams statt Bytes im Speicher und Listen und Löschen für die Aufbewahrung.
- **Treiber fs** nur ausserhalb der Produktion, wie im Rest des Repos (`STORAGE_DRIVER=fs`, Dateien unter `<STORAGE_FS_ROOT>/backups/`). Für Tests und lokale Proben.
- **Grenze:** Ein einzelner PUT ist bei S3 bis 5 GiB erlaubt. Darüber bricht die Aufgabe mit Hinweis ab; dann braucht es einen Multipart-Upload (`@aws-sdk/lib-storage`). Heute ist der Dump unter 1 MB.

## Aufbewahrung

Reine Funktion `planRetention` in `apps/cron/src/backup/retention.ts`, mit Tests:

- **14 Tage:** Alle Sicherungen der letzten 14 Tage (heute eingeschlossen) bleiben, auch mehrere am selben Tag.
- **8 Wochen:** Je Woche (Montag bis Sonntag) die neueste vollständige Sicherung, normalerweise die vom Sonntag. Fehlt der Sonntag, bleibt der Samstag.
- **12 Monate:** Je Monat die älteste vollständige Sicherung, normalerweise die vom 1. Fehlt der 1., bleibt der 2.
- **Immer:** Die neueste vollständige Sicherung bleibt, auch wenn sie älter ist (zum Beispiel, wenn die Aufgabe lange nicht lief). Sicherungen aus der Zukunft und fremde Schlüssel werden nie gelöscht.
- **Unvollständig** (Dump ohne Manifest oder umgekehrt): bleibt in der 14-Tage-Frist, danach weg. Für Woche und Monat zählen nur vollständige.
- Gelöscht werden Dump und Manifest immer zusammen. Höchstens rund 14 + 8 + 12 = 34 Sicherungen.

## Wer den Schlüssel hält

- **Hauptschlüssel:** die Inhaberin oder der Inhaber der Plattform. Datei offline, im Passwortmanager und auf einem verschlüsselten USB-Stick.
- **Notfallschlüssel:** eine zweite, benannte Person (Stellvertretung), getrennt aufbewahrt, zum Beispiel ausgedruckt im Tresor.
- **Nie** auf Railway, in GitHub, in der `.env` oder in einem Chat.
- **Wechsel:** neuen Schlüssel erzeugen, als zusätzlichen Empfänger eintragen. Den alten erst entfernen und vernichten, wenn die letzte damit verschlüsselte Sicherung gelöscht ist (nach 12 Monaten). Wer den alten Schlüssel hat, kann alte Sicherungen weiter öffnen.

### Schlüssel erzeugen (einmalig, offline)

Auf einem Rechner ohne Netz, mit `age` (Debian/Ubuntu `apt install age`, macOS `brew install age`):

```sh
umask 077
age-keygen -o gotit-backup-haupt.key      # privater Schlüssel, Zeile «AGE-SECRET-KEY-1…»
age-keygen -o gotit-backup-notfall.key
age-keygen -y gotit-backup-haupt.key      # gibt den öffentlichen Schlüssel «age1…» aus
age-keygen -y gotit-backup-notfall.key
```

Optional mit Passphrase statt Klartext-Datei: `age-keygen | age -p -a > gotit-backup-haupt.key.age`. `age --decrypt -i gotit-backup-haupt.key.age` fragt dann am Terminal nach der Passphrase; das geht auch mit dem Restore-Skript, weil `age` direkt vom Terminal liest.

Die beiden `age1…` kommen kommagetrennt in `BACKUP_AGE_RECIPIENTS` am Dienst `cron-backup-database`. Öffentliche Schlüssel sind kein Geheimnis.

## Restore Schritt für Schritt

Werkzeug: `apps/cron/src/restore.ts`, gestartet mit `pnpm --filter @app/cron restore -- …`. Es läuft auf dem Rechner der Betreiberin, nie auf Railway.

**Voraussetzungen auf dem Rechner:**

- Checkout des Repos auf dem Stand der Produktion und `pnpm install`.
- `age` und `pg_restore` ≥ 18. Debian/Ubuntu: PGDG-Repository und `postgresql-client-18`; macOS: `brew install postgresql@18`.
- Die Datei mit dem privaten Schlüssel.
- Zugang zur Ziel-Datenbank von aussen: an einem Railway-Postgres den TCP-Proxy einschalten (öffentliche URL `…proxy.rlwy.net`).

**Ablauf:**

1. **Ziel anlegen.** Im Notfall eine neue Postgres-Instanz in Railway (Version 18) statt der kaputten. Für die Probe eine leere Datenbank (`CREATE DATABASE restore_drill;`).
2. **Zugang zum Bucket** setzen, nur in dieser Shell:

   ```sh
   export STORAGE_DRIVER=s3 S3_ENDPOINT=… S3_REGION=… \
     S3_BACKUPS_BUCKET=… S3_BACKUPS_ACCESS_KEY_ID=… S3_BACKUPS_SECRET_ACCESS_KEY=…
   export PROTECTED_DATABASE_URLS='postgresql://…@<prod-proxy-host>:<port>/railway'
   ```

3. **Sicherung wählen:** die neueste unter `postgres/YYYY/MM/DD/` im Railway-Dashboard des Buckets (oder mit `aws s3 ls --endpoint-url "$S3_ENDPOINT" s3://$S3_BACKUPS_BUCKET/postgres/ --recursive`). Nur Sicherungen mit `.manifest.json` daneben sind vollständig.
4. **Zurückspielen:**

   ```sh
   pnpm --filter @app/cron restore -- \
     --key postgres/2026/11/18/20261118T021300Z.dump.age \
     --identity ~/gotit-backup-haupt.key \
     --target-url 'postgresql://postgres:…@<host>:<port>/railway'
   ```

   Ohne Bucket geht es auch mit lokalen Dateien: `--file <dump.age> --manifest <manifest.json>` statt `--key`.

   Das Skript:
   - liest das Manifest,
   - prüft das Ziel,
   - lädt die Datei und vergleicht SHA-256 und Grösse mit dem Manifest (bei Abweichung bricht es ab, bevor es etwas zurückspielt),
   - entschlüsselt mit `age --decrypt` als Stream nach `pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --single-transaction`.

   Ein Fehler rollt den ganzen Restore zurück.
5. **Prüfung** (automatisch, Exit 0 nur wenn alles stimmt):
   - Zeilen pro Tabelle gleich wie im Manifest.
   - Neueste Migration und Anzahl gleich wie im Manifest.
   - Keine ungültigen Indizes; Anzahl der Fremdschlüssel.
   - `prisma migrate status` gegen das Ziel. Ist die Sicherung älter als der Checkout, sind ausstehende Migrationen nur ein Hinweis; ist sie gleich alt, ist ein Fehler ein Fehler. Mit `--skip-prisma` überspringen.
6. **Umschalten** (nur im Notfall): `web`, `worker` und alle Cron-Dienste stoppen. `DATABASE_URL` der Dienste auf die neue Instanz zeigen lassen (Referenz `${{<neuer-dienst>.DATABASE_URL}}`), Dienste neu starten. `/api/health` prüfen. Danach den TCP-Proxy wieder ausschalten.
7. **Nachher:** Zeitpunkt der Sicherung und verlorenes Zeitfenster im Vorfallprotokoll festhalten. Neu hochgeladene Medien liegen unabhängig davon in den Buckets `originals` und `derivatives`; Verweise auf Medien, die nach der Sicherung kamen, fehlen in der Datenbank.

**Schutz der Produktion:**

- Das Skript verweigert ein Ziel, das gleich `DATABASE_URL` oder einem Eintrag aus `PROTECTED_DATABASE_URLS` ist (Host, Port, Datenbank), ausser mit `--i-know`.
- Es verweigert auch die Datenbank, aus der die Sicherung stammt (gleiche Cluster-Kennung und gleicher Name), ausser mit `--i-know`.
- Ein Ziel mit Tabellen braucht zusätzlich `--overwrite`.
- Der empfohlene Weg im Notfall ist deshalb eine **neue** Instanz, nicht das Überschreiben der alten.

## Restore-Probe

- **Automatisch** (`apps/cron/src/backup/backup-restore.test.ts`, läuft mit `pnpm test` und in der CI):
  - Legt zwei Wegwerf-Datenbanken an und füllt die Quelle (Tabellen mit Fremdschlüssel und Index, `_prisma_migrations`).
  - Erzeugt ein age-Schlüsselpaar mit `age-keygen` und sichert mit dem echten `pg_dump` und `age` in den Treiber fs.
  - Spielt in die zweite Datenbank zurück und vergleicht Zeilen und eine MD5 über die ganze Tabelle `item`. Eine Zeile, die nach der Sicherung kam, darf nicht auftauchen.
  - Prüft auch:
    - die Weigerung ohne Empfänger,
    - die Aufbewahrung,
    - den Schutz von Quelle, geschützter URL und bestehender Datenbank,
    - den Abbruch bei manipulierter Datei.
  - Räumt die Datenbanken mit `DROP DATABASE … WITH (FORCE)` wieder ab.
  - Braucht `DATABASE_URL` mit `CREATEDB` und die Werkzeuge `pg_dump`, `pg_restore`, `age`, `age-keygen`. Fehlen sie, wird der Test übersprungen, ausser in der CI (`CI` gesetzt): Dort schlägt er fehl. Die CI installiert `age` dafür.
- **Probe auf Staging, vierteljährlich** und nach jeder Änderung an der Sicherung:
  1. In `staging` den Dienst `cron-backup-database` einmal von Hand auslösen («Run now»). Im Log muss `backup_uploaded` stehen.
  2. In der Staging-Postgres eine leere Datenbank `restore_drill` anlegen (TCP-Proxy an).
  3. Restore wie oben mit `--target-url …/restore_drill` und den Bucket-Werten von Staging.
  4. Ergebnis (Ausgabe des Skripts, Dauer, Grösse) mit Datum in diesem Abschnitt unter «Proben» eintragen.
  5. `DROP DATABASE restore_drill;`, TCP-Proxy aus.
  6. Einmal im Jahr dasselbe mit einer Sicherung aus `production` in eine Wegwerf-Instanz, mit dem **Notfallschlüssel**: So ist geprüft, dass auch die Stellvertretung zurückspielen kann.

### Proben

| Datum | Umgebung | Sicherung | Ergebnis |
| --- | --- | --- | --- |
| 18.11.2026 | lokal (Postgres 16) | lokale Entwicklungsdatenbank, 59 Tabellen, 8396 Zeilen, 0,7 MB | alle Prüfungen OK inkl. `prisma migrate status`, Restore 5 s |

## RPO und RTO

- **RPO** (höchstens verlorene Daten): 24 Stunden über den Dump, ebenso über die täglichen Volume-Backups. PITR von Railway könnte das auf Minuten senken (nicht geprüft, siehe oben).
- **RTO** (Zeit bis wieder in Betrieb): Ziel **2 Stunden** (Vorschlag, mit der Betreiberin festzulegen). Heute dauern Download, Entschlüsselung und Restore Sekunden. Die Zeit geht in Ziel anlegen, Umschalten und Prüfen; bei einigen GB rechnen wir mit Minuten pro GB.

## Offene Punkte

- **Löschen durch Angreifer:** Die Zugangsdaten am Dienst dürfen löschen (die Aufbewahrung braucht das). Wer sie hat, kann die Sicherungen löschen, aber nicht lesen. Die Volume-Backups sind die unabhängige Schicht. Ob Railway-Buckets Versionierung oder Object Lock bieten, ist **nicht geprüft**.
- Ob sich für die Betreiberin Zugangsdaten nur zum Lesen anlegen lassen, ist **nicht geprüft**.
- Alarm bei ausbleibender Sicherung: Railway meldet einen fehlgeschlagenen Lauf. Ein Lauf, der gar nicht startet, fällt nur bei der Probe auf. Prüfung «neueste Sicherung älter als 26 h» kommt mit der Überwachung.
