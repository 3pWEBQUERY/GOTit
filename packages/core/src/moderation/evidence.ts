import { z } from "zod";

/**
 * Kopie im Fall, wie `messaging/reports.ts` sie anlegt: eine gemeldete
 * Nachricht oder die letzten zehn Nachrichten der Gegenseite. Was nicht in
 * diese Form passt, gilt als fehlende Kopie.
 */
const messageEvidenceSchema = z.object({
  conversationId: z.string(),
  senderId: z.string(),
  sentAt: z.string(),
  body: z.string().nullable(),
});

const conversationEvidenceSchema = z.object({
  conversationId: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),
      body: z.string().nullable(),
      sentAt: z.string(),
    }),
  ),
});

export type ParsedEvidence =
  | { kind: "message"; senderId: string; sentAt: Date; body: string | null }
  | {
      kind: "conversation";
      messages: { id: string; sentAt: Date; body: string | null }[];
    }
  | { kind: "none" };

export function parseEvidence(value: unknown): ParsedEvidence {
  const message = messageEvidenceSchema.safeParse(value);
  if (message.success)
    return {
      kind: "message",
      senderId: message.data.senderId,
      sentAt: new Date(message.data.sentAt),
      body: message.data.body,
    };
  const conversation = conversationEvidenceSchema.safeParse(value);
  if (conversation.success)
    return {
      kind: "conversation",
      messages: conversation.data.messages.map((entry) => ({
        id: entry.id,
        sentAt: new Date(entry.sentAt),
        body: entry.body,
      })),
    };
  return { kind: "none" };
}

/** Umfang der Kopie ohne Inhalt, für die verdeckte Ansicht. */
export function evidenceSize(evidence: ParsedEvidence): number {
  if (evidence.kind === "message") return 1;
  if (evidence.kind === "conversation") return evidence.messages.length;
  return 0;
}
