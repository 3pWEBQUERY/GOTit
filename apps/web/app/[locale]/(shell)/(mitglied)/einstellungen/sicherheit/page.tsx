import { getOwnProfile } from "@app/core/account";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/account/require-account";
import { AsyncList } from "@/features/settings/components/async-list";
import { SettingsBlock } from "@/features/settings/components/settings-block";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { PasskeysSection } from "@/features/settings/security/passkeys-section";
import { PasswordForm } from "@/features/settings/security/password-form";
import { SecurityLog } from "@/features/settings/security/security-log";
import { SessionsSection } from "@/features/settings/security/sessions-section";
import { TwoFactorSection } from "@/features/settings/security/two-factor-section";

export async function generateMetadata({ params }: PageProps<"/[locale]/einstellungen/sicherheit">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "settings" });
  return { title: t("security.metaTitle") };
}

export default async function SecuritySettingsPage({ params }: PageProps<"/[locale]/einstellungen/sicherheit">) {
  const locale = (await params).locale as Locale;
  const viewer = await requireAccount(locale);
  const [t, profile] = await Promise.all([getTranslations({ locale, namespace: "settings.security" }), getOwnProfile(viewer.userId)]);
  return (
    <>
      <SettingsHeader title={t("metaTitle")} intro={t("intro")} />
      <SettingsBlock id="passwort" title={t("password.title")}>
        <PasswordForm />
      </SettingsBlock>
      <SettingsBlock id="zweiter-faktor" title={t("twoFactor.title")} intro={t("twoFactor.intro")}>
        <TwoFactorSection enabled={profile.twoFactorEnabled} />
      </SettingsBlock>
      <SettingsBlock id="passkeys" title={t("passkeys.title")} intro={t("passkeys.intro")}>
        <AsyncList loadingLabel={t("passkeys.loading")}>
          <PasskeysSection userId={viewer.userId} />
        </AsyncList>
      </SettingsBlock>
      <SettingsBlock id="sitzungen" title={t("sessions.title")} intro={t("sessions.intro")}>
        <AsyncList loadingLabel={t("sessions.loading")}>
          <SessionsSection userId={viewer.userId} />
        </AsyncList>
      </SettingsBlock>
      <SettingsBlock id="protokoll" title={t("log.title")} intro={t("log.intro")}>
        <AsyncList loadingLabel={t("log.loading")}>
          <SecurityLog userId={viewer.userId} />
        </AsyncList>
      </SettingsBlock>
    </>
  );
}
