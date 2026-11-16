import { getOwnProfile } from "@app/core/account";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/account/require-account";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { ProfileForm } from "@/features/settings/profile/profile-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/einstellungen/profil">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "settings" });
  return { title: t("profile.metaTitle") };
}

export default async function ProfileSettingsPage({ params }: PageProps<"/[locale]/einstellungen/profil">) {
  const locale = (await params).locale as Locale;
  const viewer = await requireAccount(locale);
  const [t, profile] = await Promise.all([getTranslations({ locale, namespace: "settings" }), getOwnProfile(viewer.userId)]);
  return (
    <>
      <SettingsHeader title={t("sections.profile")} intro={t("profile.intro")} />
      <ProfileForm initial={{ name: profile.name, username: profile.username ?? "" }} email={profile.email} />
    </>
  );
}
