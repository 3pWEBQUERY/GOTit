import { LoadingRegion, SkeletonRow } from "@app/ui";

/** Ladezustand einer Liste: Zeilen in der Form des Inhalts, kein Spinner (PRD 13). */
export function ListSkeleton({ label, rows = 2 }: { label: string; rows?: number }) {
  return (
    <LoadingRegion label={label}>
      {Array.from({ length: rows }, (_, row) => (
        <SkeletonRow key={row} />
      ))}
    </LoadingRegion>
  );
}
