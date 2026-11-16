import { Suspense, type ReactNode } from "react";
import { ListSkeleton } from "./list-skeleton";
import { SectionBoundary } from "./section-boundary";

/** Eine Liste mit eigenem Lade- und Fehlerzustand; leer und bereit regelt die Liste selbst (PRD 13). */
export function AsyncList({ loadingLabel, children }: { loadingLabel: string; children: ReactNode }) {
  return (
    <SectionBoundary>
      <Suspense fallback={<ListSkeleton label={loadingLabel} />}>{children}</Suspense>
    </SectionBoundary>
  );
}
