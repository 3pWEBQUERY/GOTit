import type { ReactNode } from "react";
import { cn } from "../../cn";

export interface EmptyStateProps {
  /** Ein Satz, was hier stehen wird. */
  title: ReactNode;
  description?: ReactNode;
  /** Die eine Aktion, die den Bereich füllt. */
  action?: ReactNode;
  /** Ein dezentes Lucide-Icon, keine Illustration. */
  icon?: ReactNode;
  className?: string;
}

/**
 * Leerzustand: ein Satz und die eine Aktion. «Keine Treffer» und «noch nichts
 * angelegt» sind verschiedene Sätze; die Ansicht wählt den richtigen.
 */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-start gap-2 py-8 text-ink", className)}>
      {icon ? (
        <span aria-hidden className="mb-2 text-ink-muted [&_svg]:size-6">
          {icon}
        </span>
      ) : null}
      <p className="max-w-prose text-body font-[550]">{title}</p>
      {description ? <p className="max-w-prose text-small text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
