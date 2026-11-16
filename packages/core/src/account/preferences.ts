import { getDb, type Prisma } from "@app/db";
import { isLockedNotification, resolveNotifications } from "./policy";
import { preferenceSchema, type PreferenceInput } from "./schemas";

export async function getOwnPreferences(userId: string) {
  const row = await getDb().userPreference.findUnique({ where: { userId } });
  return {
    locale: row?.locale ?? null,
    theme: (row?.theme ?? "system") as "system" | "light" | "dark",
    reducedMotion: row?.reducedMotion ?? false,
    neutralTabTitle: row?.neutralTabTitle ?? false,
    showOnlineStatus: row?.showOnlineStatus ?? false,
    readReceipts: row?.readReceipts ?? false,
    profileVisibility: row?.profileVisibility ?? "MEMBERS",
    notifications: resolveNotifications(row?.notifications),
  };
}

export type OwnPreferences = Awaited<ReturnType<typeof getOwnPreferences>>;

/**
 * Speichert eine einzelne Einstellung sofort (Schalter, PRD 13). Eine
 * Benachrichtigung ändert genau ein Ereignis und einen Kanal.
 */
export async function updateOwnPreferences(userId: string, input: PreferenceInput): Promise<OwnPreferences> {
  const { notification, ...fields } = preferenceSchema.parse(input);
  const data: Prisma.UserPreferenceUncheckedUpdateInput = { ...fields };
  if (notification) {
    if (isLockedNotification(notification.event, notification.channel)) throw new Error("notification-locked");
    const current = (await getOwnPreferences(userId)).notifications;
    data.notifications = { ...current, [notification.event]: { ...current[notification.event], [notification.channel]: notification.enabled } };
  }
  await getDb().userPreference.upsert({
    where: { userId },
    create: { ...(data as Prisma.UserPreferenceUncheckedCreateInput), userId },
    update: data,
  });
  return getOwnPreferences(userId);
}
