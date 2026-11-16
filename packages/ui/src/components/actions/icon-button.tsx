import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";
import { BadgeName } from "./badge-name";

const iconButtonVariants = cva(
  [
    "inline-flex size-11 shrink-0 items-center justify-center rounded-control border transition-colors duration-state",
    "disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:size-5",
  ],
  {
    variants: {
      variant: {
        quiet: "border-transparent text-ink hover:bg-surface-2 active:bg-border aria-pressed:bg-surface-2",
        outlined: "border-border-strong bg-surface text-ink hover:bg-surface-2 active:bg-border",
        primary: "border-transparent bg-accent text-on-accent hover:bg-accent/90",
      },
    },
    defaultVariants: { variant: "quiet" },
  },
);

export interface IconButtonProps
  extends Omit<ComponentPropsWithRef<"button">, "children" | "aria-label">,
    VariantProps<typeof iconButtonVariants> {
  /** Zugänglicher Name. Pflicht, weil das Icon allein nichts sagt. Steht als unsichtbarer Text im Button. */
  label: string;
  icon: ReactNode;
  /** Kleine Zahl am Icon, zum Beispiel ungelesene Nachrichten. Steht auch im Namen. */
  badge?: number;
}

/** Button, der nur ein Icon zeigt. Tippfläche 44 × 44 px. */
export function IconButton({ label, icon, badge, variant, className, type, ...props }: IconButtonProps) {
  return (
    <button type={type ?? "button"} title={label} className={cn(iconButtonVariants({ variant }), "relative", className)} {...props}>
      <span aria-hidden className="contents">
        {icon}
      </span>
      <BadgeName label={label} badge={badge} />
    </button>
  );
}
