import { getDb, Prisma } from "@app/db";
import { participantOf } from "./access";
import { MAX_LABELS, idSchema, labelNameSchema, noteSchema } from "./schemas";

/**
 * Private Labels und Notizen des Anbieters (v1 FR-CHAT-003, v2 11.4). Nur die
 * Anbieterseite einer Unterhaltung kann sie setzen; die Gegenseite sieht sie
 * nie. Die Standard-Labels legt die Oberfläche beim ersten Öffnen mit ihren
 * übersetzten Namen an; danach sind es gewöhnliche, frei benennbare Labels.
 */
export interface LabelSummary {
  id: string;
  name: string;
}

export type LabelResult =
  | { ok: true; id: string }
  | { ok: false; reason: "invalid" | "duplicate" | "limit" | "not-found" };

export async function listLabels(userId: string): Promise<LabelSummary[]> {
  return getDb().chatLabel.findMany({
    where: { ownerUserId: userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });
}

/** Legt die Standard-Labels an, wenn das Konto noch keine hat. Idempotent. */
export async function ensureDefaultLabels(
  userId: string,
  names: readonly string[],
): Promise<void> {
  const db = getDb();
  if ((await db.chatLabel.count({ where: { ownerUserId: userId } })) > 0)
    return;
  await db.chatLabel.createMany({
    data: names.map((name, index) => ({
      ownerUserId: userId,
      name,
      sortOrder: index,
    })),
    skipDuplicates: true,
  });
}

function duplicate(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createLabel(
  userId: string,
  input: unknown,
): Promise<LabelResult> {
  const parsed = labelNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const count = await db.chatLabel.count({ where: { ownerUserId: userId } });
  if (count >= MAX_LABELS) return { ok: false, reason: "limit" };
  try {
    return {
      ok: true,
      id: (
        await db.chatLabel.create({
          data: { ownerUserId: userId, name: parsed.data, sortOrder: count },
          select: { id: true },
        })
      ).id,
    };
  } catch (error) {
    if (duplicate(error)) return { ok: false, reason: "duplicate" };
    throw error;
  }
}

export async function renameLabel(
  userId: string,
  labelId: string,
  input: unknown,
): Promise<LabelResult> {
  const parsed = labelNameSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(labelId).success)
    return { ok: false, reason: "invalid" };
  try {
    const { count } = await getDb().chatLabel.updateMany({
      where: { id: labelId, ownerUserId: userId },
      data: { name: parsed.data },
    });
    return count > 0
      ? { ok: true, id: labelId }
      : { ok: false, reason: "not-found" };
  } catch (error) {
    if (duplicate(error)) return { ok: false, reason: "duplicate" };
    throw error;
  }
}

export async function deleteLabel(
  userId: string,
  labelId: string,
): Promise<boolean> {
  if (!idSchema.safeParse(labelId).success) return false;
  const { count } = await getDb().chatLabel.deleteMany({
    where: { id: labelId, ownerUserId: userId },
  });
  return count > 0;
}

/** Setzt die Labels einer Unterhaltung. Fremde Label-IDs fallen weg. */
export async function setConversationLabels(
  userId: string,
  conversationId: string,
  labelIds: readonly string[],
): Promise<boolean> {
  const participation = await participantOf(userId, conversationId);
  if (!participation || participation.role !== "PROVIDER") return false;
  const db = getDb();
  const own = await db.chatLabel.findMany({
    where: {
      ownerUserId: userId,
      id: { in: labelIds.filter((id) => idSchema.safeParse(id).success) },
    },
    select: { id: true },
  });
  await db.$transaction([
    db.conversationLabel.deleteMany({ where: { conversationId, userId } }),
    db.conversationLabel.createMany({
      data: own.map((label) => ({ conversationId, userId, labelId: label.id })),
    }),
  ]);
  return true;
}

export async function setConversationNote(
  userId: string,
  conversationId: string,
  input: unknown,
): Promise<boolean> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return false;
  const participation = await participantOf(userId, conversationId);
  if (!participation || participation.role !== "PROVIDER") return false;
  await getDb().conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { note: parsed.data || null },
  });
  return true;
}
