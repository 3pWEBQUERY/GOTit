import { createRedisConnection, userChannel } from "@app/jobs";
import type { Redis } from "ioredis";
import { createLogger } from "../observability";

const logger = createLogger("messaging");
let publisher: Redis | null = null;

/**
 * Ereignis an den Echtzeit-Dienst (PRD v2 14.1). Es trägt nur die ID der
 * Unterhaltung, nie Inhalte: Der Browser lädt Neues selbst über `web` mit
 * derselben Berechtigungsprüfung. Fällt Redis aus, kommt die Nachricht trotzdem
 * an und erscheint beim nächsten Laden.
 */
export type MessagingEvent = { type: "conversation"; conversationId: string };

export async function notifyUsers(
  userIds: readonly string[],
  event: MessagingEvent,
): Promise<void> {
  try {
    publisher ??= createRedisConnection();
    const payload = JSON.stringify(event);
    await Promise.all(
      [...new Set(userIds)].map((userId) =>
        publisher?.publish(userChannel(userId), payload),
      ),
    );
  } catch (error) {
    logger.error("notify_failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}
