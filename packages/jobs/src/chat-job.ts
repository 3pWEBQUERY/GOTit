import { z } from "zod";
import type { JobDefinition } from "./definitions";

/** Payload der Queue `chat-attachment`: nur die ID; der Worker liest den Rest aus der Datenbank. */
export const chatAttachmentJobSchema = z.object({
  attachmentId: z.string().min(1).max(64),
});
export type ChatAttachmentJob = z.infer<typeof chatAttachmentJobSchema>;
export const chatAttachmentJob: JobDefinition<ChatAttachmentJob> = {
  queue: "chat-attachment",
  schema: chatAttachmentJobSchema,
};
