import { UiLink, buttonVariants } from "@app/ui";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export interface StepBack {
  href: string;
  label: string;
}

/** Fuss eines Schritts: die eine Hauptaktion und «Zurück» zum vorigen Schritt. */
export function StepActions({ children, back }: { children: ReactNode; back: StepBack | null }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 xs:flex-row xs:flex-wrap xs:items-center xs:justify-between">
      {back ? (
        <UiLink href={back.href} className={buttonVariants({ variant: "quiet" })}>
          <ArrowLeft aria-hidden strokeWidth={1.5} />
          <span className="text-center">{back.label}</span>
        </UiLink>
      ) : (
        <span aria-hidden />
      )}
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}
