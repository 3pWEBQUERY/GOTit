import { createLogger } from "@app/core/observability";
import { runBackup } from "../backup/backup";
import { backupWorkDir, parseRecipients, resolveBackupStoreConfig } from "../backup/config";
import { createBackupStore } from "../backup/store";

const logger = createLogger("cron");

/**
 * Tägliche, verschlüsselte Sicherung der Datenbank in den Bucket `backups`
 * (PRD v2 14.2, Entscheid 0024). Ohne `BACKUP_AGE_RECIPIENTS` bricht sie ab.
 */
export async function backupDatabase(): Promise<void> {
  try {
    const recipients = parseRecipients(process.env.BACKUP_AGE_RECIPIENTS);
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) throw new Error("DATABASE_URL ist nicht gesetzt.");
    const store = createBackupStore(resolveBackupStoreConfig());
    const result = await runBackup({ databaseUrl, recipients, store, workDir: backupWorkDir(), logger });
    logger.info("backup_database", { key: result.key, bytes: result.manifest.sizeBytes, removed: result.removed.length });
  } catch (error) {
    // index.ts protokolliert nur den Fehlertyp; die Meldung enthält keine Zugangsdaten (Passwort geht über PGPASSWORD).
    logger.error("backup_database_failed", { message: error instanceof Error ? error.message.slice(0, 500) : "unknown" });
    throw error;
  }
}
