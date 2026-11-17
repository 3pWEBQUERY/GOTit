import { hasPermission } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/features/admin/access";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { SYSTEM_PAGES } from "@/features/admin/system/system-tabs";
import { createHref } from "@/features/shell/nav/href";

type Props = { params: Promise<{ locale: string }> };

/** `/admin/system` führt zur ersten Unterseite, für die ein Recht besteht. */
export default async function SystemPage({ params }: Props) {
  const locale = (await params).locale as Locale;
  const { actor } = await getAdminContext();
  const first = SYSTEM_PAGES.find((page) => hasPermission(actor, page.permission));
  if (!first) return <RestrictedArea locale={locale} area="flags" />;
  redirect(createHref(locale)(first.pathname));
}
