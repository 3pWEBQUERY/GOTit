import { NOTIFICATION_EVENTS, getOwnPreferences, isLockedNotification } from "@app/core/account";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/account/require-account";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { NotificationTable } from "@/features/settings/notifications/notification-table";

export async function generateMetadata({ params }: PageProps<"/[locale]/einstellungen/benachrichtigungen">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "settings" });
  return { title: t("notifications.metaTitle") };
}

export default async function NotificationSettingsPage({ params }: PageProps<"/[locale]/einstellungen/benachrichtigungen">) {
  const locale = (await params).locale as Locale;
  const viewer = await requireAccount(locale);
  const [t, preferences] = await Promise.all([getTranslations({ locale, namespace: "settings" }), getOwnPreferences(viewer.userId)]);
  const locked = NOTIFICATION_EVENTS.filter((event) => isLockedNotification(event, "email"));
  return (
    <>
      <SettingsHeader title={t("notifications.metaTitle")} intro={t("notifications.intro")} />
      <NotificationTable events={NOTIFICATION_EVENTS} initial={preferences.notifications} locked={locked} />
    </>
  );
}
