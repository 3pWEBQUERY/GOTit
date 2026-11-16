/** Redis-Kanal, über den `web` und `worker` Ereignisse an ein Konto verteilen. */
export const USER_CHANNEL_PREFIX = "user:";

export function userChannel(userId: string): string {
  return `${USER_CHANNEL_PREFIX}${userId}`;
}
