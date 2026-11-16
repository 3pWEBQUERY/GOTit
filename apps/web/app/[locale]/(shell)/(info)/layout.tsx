import type { Locale } from "@app/core/locale";
import { PageMain } from "@/features/shell/components/page-main";
import { ShellFooter } from "@/features/shell/components/shell-footer";

export default async function SectionLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  return (
    <>
      <PageMain>{children}</PageMain>
      <ShellFooter locale={locale} />
    </>
  );
}
