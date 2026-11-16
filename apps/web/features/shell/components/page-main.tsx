import { cn } from "@app/ui";
import type { ReactNode } from "react";

/** Inhaltsbereich einer Seite: höchstens 1280 px, Platz für die mobile Tab-Leiste. */
export function PageMain({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main id="inhalt" tabIndex={-1} className={cn("mx-auto w-full max-w-content flex-1 px-4 pt-4 pb-28 outline-none md:px-6 md:pt-8 md:pb-16", className)}>
      {children}
    </main>
  );
}
