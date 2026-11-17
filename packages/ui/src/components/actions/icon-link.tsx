import type { ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink, type UiLinkProps } from "../../link/ui-link";
import { BadgeName } from "./badge-name";

export interface IconLinkProps extends Omit<UiLinkProps, "children" | "aria-label"> {
  /** Zugänglicher Name. Pflicht, weil das Icon allein nichts sagt. */
  label: string;
  icon: ReactNode;
  /** Kleine Zahl am Icon, zum Beispiel ungelesene Nachrichten. Steht auch im Namen. */
  badge?: number;
  /** Bedeutung der Zahl für Screenreader, zum Beispiel «3 ungelesen». */
  badgeLabel?: string;
}

/** Link, der nur ein Icon zeigt; Gegenstück zum IconButton für Navigation. Tippfläche 44 × 44 px. */
export function IconLink({ label, icon, badge, badgeLabel, className, ...props }: IconLinkProps) {
  return (
    <UiLink
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
      <BadgeName label={label} badge={badge} badgeLabel={badgeLabel} />
    </UiLink>
  );
}
