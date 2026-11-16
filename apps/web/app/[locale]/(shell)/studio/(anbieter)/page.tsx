import type { Locale } from "@app/core/locale";
import { UiLink } from "@app/ui";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { createHref } from "@/features/shell/nav/href";
import { getViewer } from "@/features/shell/queries/get-viewer";
import { TodoList, type TodoEntry } from "@/features/studio-today/components/todo-list";

export async function generateMetadata({ params }: PageProps<"/[locale]/studio">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "studio" });
  return { title: t("today.metaTitle") };
}

/** Heute. Bis Schritt 1.12 Aufgaben und Kennzahlen liefert, zeigt die Liste nur den Prüfstatus des Profils. */
export default async function StudioTodayPage({ params }: PageProps<"/[locale]/studio">) {
  const locale = (await params).locale as Locale;
  const [t, format, viewer] = await Promise.all([getTranslations({ locale, namespace: "studio" }), getFormatter({ locale }), getViewer()]);
  const provider = viewer.kind === "account" ? viewer.provider : null;
  const statusText = { SUBMITTED: t("today.inReview"), CHANGES_REQUESTED: t("today.changesRequested"), SUSPENDED: t("today.suspended") } as const;
  const entries: TodoEntry[] = provider && provider.status in statusText ? [{ id: "status", text: statusText[provider.status as keyof typeof statusText] }] : [];
  const visible = provider?.status === "PUBLISHED" || provider?.status === "PAUSED";

  return (
    <div className="flex flex-col gap-6">
      <TopBarTitle title={t("today.metaTitle")} />
      <h1 className="text-h1">{t("today.title", { date: format.dateTime(new Date(), { weekday: "long", day: "numeric", month: "long" }) })}</h1>
      <TodoList heading={t("today.todo")} entries={entries} emptyText={t("today.nothingOpen")} />
      {provider && visible ? (
        <UiLink
          href={createHref(locale)({ pathname: "/p/[name]", params: { name: provider.slug } })}
          className="inline-flex min-h-11 items-center self-start text-body text-ink underline underline-offset-4 hover:text-accent"
        >
          {t("today.viewInMarketplace")}
        </UiLink>
      ) : null}
    </div>
  );
}
