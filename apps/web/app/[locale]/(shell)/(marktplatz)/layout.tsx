import type { Locale } from "@app/core/locale";
import { requireAgeConfirmed } from "@/features/age-gate/require-age";
import { PageMain } from "@/features/shell/components/page-main";
import { ShellFooter } from "@/features/shell/components/shell-footer";

/** Beschränkter Bereich: erst nach der Altersprüfung (PRD 7.1). */
export default async function RestrictedLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  await requireAgeConfirmed(locale);
  return (
    <>
      <PageMain>{children}</PageMain>
      <ShellFooter locale={locale} />
    </>
  );
}
