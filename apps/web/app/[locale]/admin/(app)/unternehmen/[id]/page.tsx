import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { moderationAccess } from "@/features/admin/access";
import { AreaRestricted } from "@/features/admin/components/area-restricted";
import { OrganizationCaseView } from "@/features/organization/admin/case-view";
import { organizationAdminMetadata } from "@/features/organization/admin/metadata";
import { getOrganizationCase } from "@/features/organization/admin/queries";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return organizationAdminMetadata((await params).locale as Locale, "case");
}

/** Einzelfall `/admin/unternehmen/[id]` mit Entscheid Freigeben, Zur Korrektur oder Ablehnen. */
export default async function OrganizationCasePage({ params, searchParams }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const { access, actor } = await moderationAccess();
  if (!access.allowed || !actor) {
    const t = await getTranslations({ locale, namespace: "organization.admin" });
    return <AreaRestricted locale={locale} title={t("title")} description={t("restricted")} />;
  }
  const [verification, query] = await Promise.all([getOrganizationCase(actor.userId, id), searchParams]);
  if (!verification) notFound();
  return <OrganizationCaseView locale={locale} verification={verification} alreadyDecided={query.hinweis === "entschieden"} now={new Date()} />;
}
