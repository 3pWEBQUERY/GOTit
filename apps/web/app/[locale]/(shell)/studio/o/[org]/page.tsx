import { findOrganizationMembership } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { getViewer } from "@/features/shell/queries/get-viewer";
import { TodoList } from "@/features/studio-today/components/todo-list";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio/o/[org]">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "studio" });
  return { title: t("today.metaTitle") };
}

/** Heute für die Organisation. Aufgaben folgen mit den Schritten 1.11 und 1.12. */
export default async function OrganizationTodayPage({ params }: PageProps<"/[locale]/studio/o/[org]">) {
  const { locale, org } = await params;
  const membership = findOrganizationMembership(await getViewer(), org);
  if (!membership) notFound();
  const t = await getTranslations({ locale: locale as Locale, namespace: "studio" });
  const title = t("today.organizationTitle", { name: membership.name });
  return (
    <div className="flex flex-col gap-6">
      <TopBarTitle title={title} />
      <h1 className="text-h1">{title}</h1>
      <TodoList heading={t("today.todo")} entries={[]} emptyText={t("today.nothingOpen")} />
    </div>
  );
}
