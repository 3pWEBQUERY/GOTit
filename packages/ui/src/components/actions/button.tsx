import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";

export const buttonVariants = cva(
  [
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-small font-[550]",
    "border transition-colors duration-state select-none md:min-h-10",
    "disabled:cursor-not-allowed disabled:opacity-55 aria-busy:cursor-progress",
    "[&_svg]:size-[1.125rem] [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "border-transparent bg-accent text-on-accent hover:bg-accent/90 active:bg-accent/80",
        secondary: "border-border-strong bg-surface text-ink hover:bg-surface-2 active:bg-border",
        quiet: "border-transparent bg-transparent text-ink hover:bg-surface-2 active:bg-border",
        destructive: "border-transparent bg-error text-on-accent hover:bg-error/90 active:bg-error/80",
      },
      width: { auto: "", full: "w-full" },
    },
    defaultVariants: { variant: "secondary", width: "auto" },
  },
);

export interface ButtonProps extends ComponentPropsWithRef<"button">, VariantProps<typeof buttonVariants> {
  /** Rendert das Kind (zum Beispiel einen Link) mit dem Aussehen des Buttons. */
  asChild?: boolean;
  /** Zeigt den Ladezustand und verhindert doppeltes Auslösen. */
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * Button in den vier Varianten der PRD: primär, sekundär, still, destruktiv.
 * Beschriftung immer als Verb + Objekt («Anfrage senden»). Texte wachsen mit
 * der Sprache; nichts wird abgeschnitten.
 */
export function Button({ asChild, loading, icon, variant, width, className, children, disabled, type, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, width }), className);
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      type={type ?? "button"}
      className={classes}
      disabled={disabled}
      aria-busy={loading || undefined}
      {...props}
      onClick={loading ? (event) => event.preventDefault() : props.onClick}
    >
      {loading ? <LoaderCircle aria-hidden className="animate-spin" strokeWidth={1.5} /> : icon}
      <span className="text-center">{children}</span>
    </button>
  );
}
