import { Button } from "@app/ui";
import { applyTestResultAction } from "../actions/apply-test-result";
import type { TestOutcome } from "../test-provider";

const OUTCOMES: {
  outcome: TestOutcome;
  label: string;
  hint: string;
  variant: "primary" | "secondary";
}[] = [
  {
    outcome: "approved",
    label: "Bestanden",
    hint: "Volljährig, Identität und Lebendigkeit bestätigt.",
    variant: "primary",
  },
  {
    outcome: "rejected",
    label: "Abgelehnt",
    hint: "Ausweis nicht lesbar; die Person kann erneut prüfen.",
    variant: "secondary",
  },
  {
    outcome: "under-age",
    label: "Nicht volljährig",
    hint: "Sperrt das Profil sofort und meldet den Fall an Trust & Safety.",
    variant: "secondary",
  },
];

/** Drei Ergebnisse des Test-Dienstleisters als eigene Formulare ohne JavaScript. */
export function TestProviderForm({ externalRef, weiter, locale }: { externalRef: string; weiter: string; locale: string }) {
  return (
    <ul className="flex flex-col gap-4">
      {OUTCOMES.map((entry) => (
        <li key={entry.outcome} className="flex flex-col gap-2 border-b border-border pb-4">
          <form action={applyTestResultAction}>
            <input type="hidden" name="ref" value={externalRef} />
            <input type="hidden" name="outcome" value={entry.outcome} />
            <input type="hidden" name="weiter" value={weiter} />
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant={entry.variant}>
              {entry.label}
            </Button>
          </form>
          <p className="text-small text-ink-muted">{entry.hint}</p>
        </li>
      ))}
    </ul>
  );
}
