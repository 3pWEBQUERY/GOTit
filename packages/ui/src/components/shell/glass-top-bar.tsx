import type { ReactNode } from "react";

export interface GlassTopBarProps {
  /** Zurück-Button oben links; entspricht dem Browser-Zurück (PRD 6.4). */
  back?: ReactNode;
  title: string;
  actions?: ReactNode;
}

/**
 * Mobile Top-Leiste aus Glas, unter 768 px. Kein Trennstrich: Inhalt läuft
 * darunter durch und wird am Rand weich ausgeblendet (PRD 5.5).
 */
export function GlassTopBar({ back, title, actions }: GlassTopBarProps) {
  return (
    <div data-glass-top-bar className="fixed inset-x-0 top-0 z-40 md:hidden">
      <div aria-hidden className="glass glass-edge absolute inset-0 -bottom-3" />
      <div className="relative flex h-14 items-center gap-1 px-2 pt-[env(safe-area-inset-top)]">
        {back}
        <p className="min-w-0 flex-1 truncate px-2 text-h3">{title}</p>
        {actions}
      </div>
    </div>
  );
}
