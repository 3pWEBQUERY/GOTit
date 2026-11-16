import { cn } from "../../cn";

const pulse = "animate-skeleton bg-surface-2";

export interface SkeletonProps {
  /** `text` zeichnet Zeilen, `block` eine Fläche (Grösse über `className`), `circle` ein rundes Bild. */
  variant?: "text" | "block" | "circle";
  /** Anzahl Zeilen bei `variant="text"`. Die letzte Zeile ist kürzer. */
  lines?: number;
  className?: string;
}

/** Skelett in der Form des Inhalts. Rein dekorativ; den Ladezustand meldet `LoadingRegion`. */
export function Skeleton({ variant = "text", lines = 1, className }: SkeletonProps) {
  if (variant === "circle") return <div aria-hidden className={cn(pulse, "size-11 shrink-0 rounded-full", className)} />;
  if (variant === "block") return <div aria-hidden className={cn(pulse, "h-24 w-full rounded-card", className)} />;
  const count = Math.max(1, Math.floor(lines));
  return (
    <div aria-hidden className={cn("flex w-full flex-col gap-2", className)}>
      {Array.from({ length: count }, (_, line) => (
        <div key={line} className={cn(pulse, "h-4 rounded-chip", count > 1 && line === count - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Skelett einer Profilkarte: Foto im Verhältnis 4 : 5, darunter zwei Zeilen. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex w-full flex-col gap-3", className)}>
      <div className={cn(pulse, "aspect-4/5 w-full rounded-card")} />
      <div className="flex flex-col gap-2">
        <div className={cn(pulse, "h-4 w-3/4 rounded-chip")} />
        <div className={cn(pulse, "h-4 w-1/2 rounded-chip")} />
      </div>
    </div>
  );
}

/** Skelett einer Listenzeile: rundes Bild, daneben zwei Zeilen. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex w-full items-center gap-3 py-3", className)}>
      <div className={cn(pulse, "size-11 shrink-0 rounded-full")} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className={cn(pulse, "h-4 w-1/2 rounded-chip")} />
        <div className={cn(pulse, "h-4 w-3/4 rounded-chip")} />
      </div>
    </div>
  );
}
