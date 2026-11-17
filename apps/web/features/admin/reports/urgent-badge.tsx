import { TriangleAlert } from "lucide-react";

/** Kennzeichen «Dringend» (Minderjährige, Ausbeutung, akute Gefahr): Wort und Icon, nicht nur Farbe. */
export function UrgentBadge({ label }: { label: string }) {
  return (
    <span data-report-urgent className="inline-flex items-center gap-1 rounded-chip border border-error px-1 text-small font-[550] text-error">
      <TriangleAlert aria-hidden strokeWidth={1.5} className="size-4" />
      {label}
    </span>
  );
}
