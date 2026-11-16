import { UiLink } from "@app/ui";
import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

interface AuthIntroProps {
  title: string;
  intro?: ReactNode;
  /** Hilfeartikel am Start des Ablaufs (PRD 13, Hilfe). */
  help?: { href: string; label: string };
}

/** Kopf jeder Konto-Seite: die eine h1, ein Satz Einführung, der Hilfelink. */
export function AuthIntro({ title, intro, help }: AuthIntroProps) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-h1 text-ink">{title}</h1>
      {intro ? <p className="text-body text-ink-muted">{intro}</p> : null}
      {help ? (
        <p>
          <UiLink href={help.href} className="inline-flex min-h-11 items-center gap-2 text-small text-ink underline underline-offset-2">
            <CircleHelp aria-hidden strokeWidth={1.5} className="size-[1.125rem]" />
            {help.label}
          </UiLink>
        </p>
      ) : null}
    </header>
  );
}

/** Schmale Spalte für Formulare; auf grossen Bildschirmen nicht breiter als gut lesbar. */
export function AuthColumn({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-panel flex-col gap-8">{children}</div>;
}
