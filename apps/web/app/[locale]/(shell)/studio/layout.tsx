import type { Locale } from "@app/core/locale";
import { StudioFrame } from "@/features/shell/components/studio-frame";

/** Studio: nur die Seitenleiste kommt hinzu; die Kopfzeile kommt von oben (PRD 15). */
export default async function StudioLayout({ children, params }: LayoutProps<"/[locale]">) {
  return <StudioFrame locale={(await params).locale as Locale}>{children}</StudioFrame>;
}
