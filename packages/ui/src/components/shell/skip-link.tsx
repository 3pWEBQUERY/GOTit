import type { ReactNode } from "react";

/** Erster fokussierbarer Link jeder Seite: springt zum Inhalt (PRD 13). */
export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only rounded-control bg-surface px-4 py-3 text-small font-[550] text-ink shadow-floating focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
    >
      {children}
    </a>
  );
}
