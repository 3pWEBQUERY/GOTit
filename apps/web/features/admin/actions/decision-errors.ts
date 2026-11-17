import { reviewDecisionSchema } from "@app/core/verification";
import { isReviewRule } from "../rules";

const KNOWN = new Set(["reasonTooShort", "ruleRequired", "fieldNotesRequired"]);

/**
 * Prüft einen Entscheid mit dem Schema aus `@app/core/verification` und
 * übersetzt die Befunde in Schlüssel pro Feld (`admin.errors.<schlüssel>`).
 */
export function decisionFieldErrors(input: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  const parsed = reviewDecisionSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [field, area] = issue.path.map(String);
      if (!field) continue;
      const key = area ? `fieldNotes.${area}` : field;
      errors[key] ??= KNOWN.has(issue.message) ? issue.message : fallback(field, Boolean(area));
    }
  }
  const rule = typeof input === "object" && input !== null && "rule" in input ? (input as { rule: unknown }).rule : undefined;
  if (!errors.rule && (typeof rule !== "string" || !isReviewRule(rule))) errors.rule = "ruleRequired";
  return errors;
}

function fallback(field: string, isArea: boolean): string {
  if (isArea) return "fieldNoteInvalid";
  if (field === "decision") return "decisionRequired";
  if (field === "reason") return "reasonTooLong";
  if (field === "rule") return "ruleRequired";
  return "generic";
}
