import { getOwnPreferences } from "@app/core/account";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/account/require-account";
import { AsyncList } from "@/features/settings/components/async-list";
import { SettingsBlock } from "@/features/settings/components/settings-block";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { BlockedList } from "@/features/settings/privacy/blocked-list";
import { PrivacySettings } from "@/features/settings/privacy/privacy-settings";

export async function generateMetadata({ params }: PageProps<"/[locale]/einstellungen/privatsphaere">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "settings" });
  return { title: t("privacy.metaTitle") };
}

export default async function PrivacySettingsPage({ params }: PageProps<"/[locale]/einstellungen/privatsphaere">) {
  const locale = (await params).locale as Locale;
  const viewer = await requireAccount(locale);
  const [t, preferences] = await Promise.all([getTranslations({ locale, namespace: "settings" }), getOwnPreferences(viewer.userId)]);
  return (
    <>
      <SettingsHeader title={t("privacy.metaTitle")} intro={t("privacy.intro")} />
      <PrivacySettings
        profileVisibility={preferences.profileVisibility}
        showOnlineStatus={preferences.showOnlineStatus}
        readReceipts={preferences.readReceipts}
      />
      <SettingsBlock id="blockiert" title={t("privacy.blocked.title")} intro={t("privacy.blocked.intro")}>
        <AsyncList loadingLabel={t("privacy.blocked.loading")}>
          <BlockedList userId={viewer.userId} />
        </AsyncList>
      </SettingsBlock>
    </>
  );
}
