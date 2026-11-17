import { UiLink, cn } from "@app/ui";

export interface PeriodOption {
  key: string;
  label: string;
  href: string;
  current: boolean;
}

/** Zeitraum der Kennzahlen auf «Heute» als Links: Er steht in der URL und geht ohne JavaScript. */
export function PeriodSwitch({
  label,
  options,
}: {
  label: string;
  options: readonly PeriodOption[];
}) {
  return (
    <nav
      aria-label={label}
      className="flex w-fit max-w-full flex-wrap gap-1 rounded-control border border-border-strong bg-surface p-1"
    >
      {options.map((option) => (
        <UiLink
          key={option.key}
          href={option.href}
          aria-current={option.current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-chip px-3 text-small font-[550] text-ink transition-colors duration-state md:min-h-10",
            option.current ? "bg-ink text-bg" : "hover:bg-surface-2",
          )}
        >
          {option.label}
        </UiLink>
      ))}
    </nav>
  );
}
