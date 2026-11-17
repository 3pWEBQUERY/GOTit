import type { Prisma, ReportTarget } from "@app/db";

/**
 * Sperren und Wiederherstellen gemeldeter Inhalte (v1 20.6 «Gesperrte
 * Inhalte werden zuverlässig verborgen»). Jede Sperre gibt den vorherigen
 * Zustand zurück, damit «Kein Verstoss» oder ein erfolgreicher Einspruch ihn
 * wiederherstellt. Sichtbar ist danach nichts mehr: Nachrichten erscheinen
 * beiden Seiten als ausgeblendet, Bewertungen und Medien nur noch mit Status
 * `PUBLISHED` öffentlich, Profile und Organisationen nur mit öffentlichem
 * Status.
 */
type Tx = Prisma.TransactionClient;

/** Ziele mit sperrbarem Inhalt. Konten (`USER`) und Adressen (`URL`) haben keinen. */
export const BLOCKABLE_TARGETS: readonly ReportTarget[] = ["MESSAGE", "REVIEW", "MEDIA", "PROFILE", "ORGANIZATION"];

export interface BlockOutcome {
  /** Vorheriger Zustand, null: nichts gesperrt (schon gesperrt oder nicht vorhanden). */
  previous: string | null;
  /** Profil, dessen Suchindex nachgezogen werden muss. */
  reindexProfileId: string | null;
}

const NONE: BlockOutcome = { previous: null, reindexProfileId: null };

export async function blockContent(tx: Tx, targetType: ReportTarget, targetId: string, actorId: string | null, now: Date): Promise<BlockOutcome> {
  switch (targetType) {
    case "MESSAGE": {
      const updated = await tx.message.updateMany({ where: { id: targetId, hiddenAt: null }, data: { hiddenAt: now, hiddenById: actorId } });
      return updated.count > 0 ? { previous: "VISIBLE", reindexProfileId: null } : NONE;
    }
    case "REVIEW": {
      const review = await tx.review.findUnique({ where: { id: targetId }, select: { status: true, providerProfileId: true } });
      if (!review || review.status === "REMOVED" || review.status === "REJECTED") return NONE;
      await tx.review.update({ where: { id: targetId }, data: { status: "REMOVED" } });
      return { previous: review.status, reindexProfileId: review.providerProfileId };
    }
    case "MEDIA": {
      const media = await tx.mediaAsset.findUnique({ where: { id: targetId }, select: { status: true } });
      if (!media || media.status === "BLOCKED") return NONE;
      await tx.mediaAsset.update({ where: { id: targetId }, data: { status: "BLOCKED" } });
      return { previous: media.status, reindexProfileId: null };
    }
    case "PROFILE": {
      const profile = await tx.providerProfile.findUnique({ where: { id: targetId }, select: { status: true } });
      if (!profile || profile.status === "SUSPENDED" || profile.status === "ARCHIVED") return NONE;
      await tx.providerProfile.update({ where: { id: targetId }, data: { status: "SUSPENDED" } });
      return { previous: profile.status, reindexProfileId: targetId };
    }
    case "ORGANIZATION": {
      const organization = await tx.organization.findUnique({ where: { id: targetId }, select: { status: true } });
      if (!organization || organization.status === "SUSPENDED" || organization.status === "ARCHIVED") return NONE;
      await tx.organization.update({ where: { id: targetId }, data: { status: "SUSPENDED" } });
      return { previous: organization.status, reindexProfileId: null };
    }
    default:
      return NONE;
  }
}

/**
 * Stellt den Zustand vor der Sperre wieder her, aber nur, wenn der Inhalt
 * noch gesperrt ist: Was jemand inzwischen anders entschieden hat, bleibt.
 */
export async function restoreContent(tx: Tx, targetType: ReportTarget, targetId: string, previous: string): Promise<string | null> {
  switch (targetType) {
    case "MESSAGE":
      await tx.message.updateMany({ where: { id: targetId }, data: { hiddenAt: null, hiddenById: null } });
      return null;
    case "REVIEW": {
      const review = await tx.review.findFirst({ where: { id: targetId, status: "REMOVED" }, select: { providerProfileId: true } });
      if (!review) return null;
      await tx.review.update({ where: { id: targetId }, data: { status: previous as "PENDING" | "PUBLISHED" } });
      return review.providerProfileId;
    }
    case "MEDIA":
      await tx.mediaAsset.updateMany({ where: { id: targetId, status: "BLOCKED" }, data: { status: previous as "PUBLISHED" } });
      return null;
    case "PROFILE": {
      const updated = await tx.providerProfile.updateMany({ where: { id: targetId, status: "SUSPENDED" }, data: { status: previous as "PUBLISHED" } });
      return updated.count > 0 ? targetId : null;
    }
    case "ORGANIZATION":
      await tx.organization.updateMany({ where: { id: targetId, status: "SUSPENDED" }, data: { status: previous as "PUBLISHED" } });
      return null;
    default:
      return null;
  }
}

/** Konto hinter einem gemeldeten Ziel, für Einschränkungen und den Verlauf früherer Fälle. */
export async function accountOfTarget(tx: Tx, targetType: ReportTarget, targetId: string, evidence: { senderId?: string } = {}): Promise<string | null> {
  switch (targetType) {
    case "USER":
      return targetId;
    case "MESSAGE": {
      const message = await tx.message.findUnique({ where: { id: targetId }, select: { senderId: true } });
      return message?.senderId ?? evidence.senderId ?? null;
    }
    case "PROFILE":
      return (await tx.providerProfile.findUnique({ where: { id: targetId }, select: { userId: true } }))?.userId ?? null;
    case "MEDIA":
      return (await tx.mediaAsset.findUnique({ where: { id: targetId }, select: { ownerUserId: true } }))?.ownerUserId ?? null;
    case "REVIEW":
      return (await tx.review.findUnique({ where: { id: targetId }, select: { authorUserId: true } }))?.authorUserId ?? null;
    default:
      return null;
  }
}
