import type { Locale } from "@app/core/locale";
import { requireAccount } from "@/features/account/require-account";
import { PageMain } from "@/features/shell/components/page-main";
import { ShellFooter } from "@/features/shell/components/shell-footer";

/** Mitgliederbereich: nur angemeldet (PRD 7.5, 8.2). */
export default async function MemberLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  await requireAccount(locale);
  return (
    <>
      <PageMain>{children}</PageMain>
      <ShellFooter locale={locale} />
    </>
  );
}
