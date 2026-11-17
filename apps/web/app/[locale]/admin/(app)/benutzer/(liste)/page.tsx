import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { AdminPageHeader } from "@/features/admin/components/page-header";
import { UserListSection } from "@/features/admin/users/list-section";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "users");
}

/** Benutzer `/admin/benutzer` (v1 9.2, v2 7.8): Suche, Filter, Tabelle. Recht `users.view`. */
export default async function UsersPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  const access = await areaAccess("users.view");
  if (!access.allowed) return <RestrictedArea locale={locale} area="users" />;
  const t = await getTranslations({ locale, namespace: "adminUsers" });
  return (
    <>
      <AdminPageHeader title={t("list.title")} intro={t("list.intro")} />
      <UserListSection locale={locale} actorId={access.actor.userId} query={await searchParams} />
    </>
  );
}
