import type { Locale } from "@app/core/locale";
import { SettingsFrame } from "@/features/settings/components/settings-frame";

/** Einstellungen: ein Abschnitt pro Route, jeder speichert für sich (PRD 12.1). */
export default async function SettingsLayout({ children, params }: LayoutProps<"/[locale]/einstellungen">) {
  const locale = (await params).locale as Locale;
  return <SettingsFrame locale={locale}>{children}</SettingsFrame>;
}
