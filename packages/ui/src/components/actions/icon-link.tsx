import type { ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink, type UiLinkProps } from "../../link/ui-link";

export interface IconLinkProps extends Omit<UiLinkProps, "children" | "aria-label"> {
  /** Zugänglicher Name. Pflicht, weil das Icon allein nichts sagt. */
  label: string;
  icon: ReactNode;
  /** Kleine Zahl am Icon, zum Beispiel ungelesene Nachrichten. Steht auch im Namen. */
  badge?: number;
}

/** Link, der nur ein Icon zeigt; Gegenstück zum IconButton für Navigation. Tippfläche 44 × 44 px. */
export function IconLink({ label, icon, badge, className, ...props }: IconLinkProps) {
  return (
    <UiLink
      aria-label={badge ? `${label} (${badge})` : label}
      title={label}
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink transition-colors duration-state hover:bg-surface-2 aria-[current=page]:text-accent [&_svg]:size-5",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="contents">
        {icon}
      </span>
      {badge ? (
        <span aria-hidden className="tabular absolute top-1 right-1 min-w-4 rounded-full bg-ink px-1 text-center text-[0.8125rem]/4 font-[550] text-bg">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </UiLink>
  );
}
