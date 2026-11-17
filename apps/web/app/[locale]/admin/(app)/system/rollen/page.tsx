import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { param } from "@/features/admin/areas/format";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { RolesSection } from "@/features/admin/system/roles-section";
import { SystemTabs } from "@/features/admin/system/system-tabs";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "roles");
}

/** Interne Rollen `/admin/system/rollen` (v2 7.8). Recht `roles.manage`. */
export default async function SystemRolesPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("roles.manage");
  if (!access.allowed) return <RestrictedArea locale={locale} area="roles" />;
  const [t, query] = await Promise.all([getTranslations({ locale, namespace: "adminSystem.roles" }), searchParams]);
  return (
    <>
      <AdminPageHeader title={t("title")} intro={t("intro")} />
      <SystemTabs locale={locale} actor={access.actor} current="roles" />
      <RolesSection locale={locale} actorId={access.actor.userId} accountId={param(query, "konto")} q={param(query, "q")} />
    </>
  );
}
