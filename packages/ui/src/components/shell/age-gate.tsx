import { useId, type ReactNode } from "react";

export interface AgeGateProps {
  title: string;
  /** Auf der Seite /alterspruefung die h1; eingebettet eine tiefere Ebene. */
  titleAs?: "h1" | "h2" | "h3";
  description: string;
  /** Was die Bestätigung bedeutet und was nicht. */
  points: readonly string[];
  /** Formular mit «Alter bestätigen» und der Link zum Verlassen. */
  children: ReactNode;
}

/** Altersprüfung vor beschränkten Inhalten (PRD 7.1). Deckende Fläche, kein Glas. */
export function AgeGate({ title, titleAs: Heading = "h1", description, points, children }: AgeGateProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="mx-auto flex max-w-reading flex-col gap-6 rounded-card border border-border bg-surface p-4 md:p-6">
      <Heading id={titleId} className="text-h1">
        {title}
      </Heading>
      <p className="max-w-prose text-body">{description}</p>
      <ul className="flex max-w-prose list-disc flex-col gap-2 pl-6 text-small text-ink-muted">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {children}
    </section>
  );
}
