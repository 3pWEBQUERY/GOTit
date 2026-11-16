import type { ReactNode } from "react";
import { cn } from "../../cn";
import { ToneIcon } from "./tone-icon";

export interface ErrorStateProps {
  /** Was passiert ist, in Klartext. */
  title: ReactNode;
  /** Was erhalten blieb («Deine Eingaben sind noch da»). */
  description: ReactNode;
  /** Was jetzt geht, zum Beispiel «Seite neu laden». */
  action: ReactNode;
  className?: string;
}

/** Fehlerzustand eines Bereichs: was passiert ist, was erhalten blieb, was jetzt geht. */
export function ErrorState({ title, description, action, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-2 py-8 text-ink", className)}>
      <ToneIcon tone="error" className="mb-2 size-6" />
      <p className="max-w-prose text-body font-[550]">{title}</p>
      <p className="max-w-prose text-small text-ink-muted">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">{action}</div>
    </div>
  );
}
