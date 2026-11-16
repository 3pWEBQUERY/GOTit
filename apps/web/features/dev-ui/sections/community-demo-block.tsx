import type { ReactNode } from "react";

/** Ein Zustand einer Komponente auf der Testseite «Community»: Zwischentitel und Beispiel. */
export function CommunityDemoBlock({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "flex min-w-0 flex-col gap-3" : "flex max-w-reading min-w-0 flex-col gap-3"}>
      <h3 className="text-h3">{title}</h3>
      {children}
    </div>
  );
}

/** Neutrale Fläche mit Initialen anstelle eines Fotos. Die Testseite zeigt keine Bilder. */
export function InitialsSurface({ initials, label }: { initials: string; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex size-full items-center justify-center bg-surface-2 text-h1 text-ink-muted">
      <span aria-hidden>{initials}</span>
    </div>
  );
}
