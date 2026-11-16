import type { ProviderStatus } from "@app/db";

export type PauseBlockReason = "not-published" | "suspended";

export interface PauseAvailability {
  /** Welche Aktion jetzt möglich ist; null, wenn keine. */
  action: "pause" | "resume" | null;
  /** Warum keine Aktion möglich ist. Die Oberfläche erklärt es, statt den Klick scheitern zu lassen (PRD 13). */
  blockedBy: PauseBlockReason | null;
}

/**
 * Pausieren ist umkehrbar und wirkt sofort (PRD 6.2). Es ändert nie einen
 * Verifizierungs- oder Prüfstatus: Nur ein bereits freigegebenes Profil lässt
 * sich pausieren, und nur ein pausiertes wieder online stellen.
 */
export function pauseAvailability(status: ProviderStatus): PauseAvailability {
  if (status === "PUBLISHED") return { action: "pause", blockedBy: null };
  if (status === "PAUSED") return { action: "resume", blockedBy: null };
  return { action: null, blockedBy: status === "SUSPENDED" ? "suspended" : "not-published" };
}
