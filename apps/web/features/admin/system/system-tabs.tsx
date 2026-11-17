import { hasPermission, type AdminActor, type AdminPermission } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { UiLink, cn } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";

export const SYSTEM_PAGES = [
  { key: "flags", pathname: "/admin/system/flags", permission: "flags.manage" },
  { key: "roles", pathname: "/admin/system/rollen", permission: "roles.manage" },
  { key: "audit", pathname: "/admin/system/audit", permission: "audit.view" },
  { key: "status", pathname: "/admin/system/status", permission: "system.status" },
] as const satisfies readonly { key: string; pathname: string; permission: AdminPermission }[];

export type SystemPageKey = (typeof SYSTEM_PAGES)[number]["key"];

/** Unterseiten des Systems als Links; nur die, für die ein Recht besteht. Die aktive steht in der URL. */
export async function SystemTabs({ locale, actor, current }: { locale: Locale; actor: AdminActor | null; current: SystemPageKey }) {
  const t = await getTranslations({ locale, namespace: "adminSystem.tabs" });
  const href = createHref(locale);
  const pages = SYSTEM_PAGES.filter((page) => hasPermission(actor, page.permission));
  if (pages.length < 2) return null;
  return (
    <nav aria-label={t("label")} className="border-b border-border">
      <ul className="flex flex-wrap gap-1">
        {pages.map((page) => (
          <li key={page.key}>
            <UiLink
              href={href(page.pathname)}
              aria-current={page.key === current ? "page" : undefined}
              className={cn("-mb-px flex min-h-10 items-center border-b-2 px-3 text-small transition-colors duration-state", page.key === current ? "border-accent font-[550] text-ink" : "border-transparent text-ink-muted hover:text-ink")}
            >
              {t(page.key)}
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
