import { UiLink } from "@app/ui";
import { notFound } from "next/navigation";
import { UI_GROUPS, UI_GROUP_TITLES } from "@/features/dev-ui/groups";

/** Testseiten des Designsystems. Nur ausserhalb der Produktion erreichbar (PRD 5.4). */
export default async function DevUiLayout({ children, params }: LayoutProps<"/[locale]/dev/ui">) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_UI !== "1") notFound();
  const { locale } = await params;
  return (
    <div className="mx-auto max-w-content px-4 py-8 md:px-6">
      <nav aria-label="Gruppen des Designsystems" className="mb-8 border-b border-border pb-4">
        <ul className="flex flex-wrap gap-x-4">
          {UI_GROUPS.map((group) => (
            <li key={group}>
              <UiLink href={`/${locale}/dev/ui/${group}`} className="inline-flex min-h-11 items-center text-small font-[550] text-ink underline underline-offset-4">
                {UI_GROUP_TITLES[group]}
              </UiLink>
            </li>
          ))}
        </ul>
      </nav>
      <main id="inhalt">{children}</main>
    </div>
  );
}
