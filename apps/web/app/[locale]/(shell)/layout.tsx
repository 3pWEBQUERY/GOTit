import type { Locale } from "@app/core/locale";
import { AppShell } from "@/features/shell/components/app-shell";

/** Die eine Shell für alles ausser Admin (PRD 15). */
export default async function ShellLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  return <AppShell locale={locale as Locale}>{children}</AppShell>;
}
