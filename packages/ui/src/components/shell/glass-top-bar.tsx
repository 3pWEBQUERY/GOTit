import type { ReactNode } from "react";

export interface GlassTopBarProps {
  /** Zurück-Button oben links; entspricht dem Browser-Zurück (PRD 6.4). */
  back?: ReactNode;
  title: string;
  actions?: ReactNode;
}

/**
 * Mobile Top-Leiste unter 768 px, dunkel wie die Kopfzeile (Entscheid 0025).
 * Deckend statt Glas: Dunkles Glas über hellem Inhalt wirkt grau und trüb.
 */
export function GlassTopBar({ back, title, actions }: GlassTopBarProps) {
  return (
    <div data-glass-top-bar className="fixed inset-x-0 top-0 z-40 text-ink scheme-dark md:hidden">
      <div aria-hidden className="absolute inset-0 border-b border-border bg-surface" />
      <div className="relative flex h-14 items-center gap-1 px-2 pt-[env(safe-area-inset-top)]">
        {back}
        <p className="min-w-0 flex-1 truncate px-2 font-display text-h3">{title}</p>
        {actions}
      </div>
    </div>
  );
}
