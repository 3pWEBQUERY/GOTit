import { deletionDueDate } from "@app/core/account";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireAccount } from "@/features/account/require-account";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { DataSettings } from "@/features/settings/data/data-settings";
import { createHref } from "@/features/shell/nav/href";

export async function generateMetadata({ params }: PageProps<"/[locale]/einstellungen/daten">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "settings" });
  return { title: t("data.metaTitle") };
}

export default async function DataSettingsPage({ params }: PageProps<"/[locale]/einstellungen/daten">) {
  const locale = (await params).locale as Locale;
  await requireAccount(locale);
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: "settings" }), getFormatter({ locale })]);
  const deletionDate = format.dateTime(deletionDueDate(new Date()), { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <>
      <SettingsHeader title={t("data.metaTitle")} intro={t("data.intro")} />
      <DataSettings deletionDate={deletionDate} homeHref={createHref(locale)("/")} />
    </>
  );
}
