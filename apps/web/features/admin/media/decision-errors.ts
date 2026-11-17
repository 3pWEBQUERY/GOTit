import { mediaDecisionSchema } from "@app/core/media/schemas";
import { isMediaRule } from "./media-rules";

const KNOWN = new Set(["decisionRequired", "reasonTooShort", "reasonTooLong"]);

/** Befunde pro Feld als Schlüssel unter `admin.errors`; die Regel ist in der Oberfläche Pflicht. */
export function mediaDecisionErrors(input: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  const parsed = mediaDecisionSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field === "decision" || field === "reason") errors[field] ??= KNOWN.has(issue.message) ? issue.message : field === "decision" ? "decisionRequired" : "reasonTooShort";
    }
  }
  const rule = typeof input === "object" && input !== null && "rule" in input ? (input as { rule: unknown }).rule : undefined;
  if (typeof rule !== "string" || !isMediaRule(rule)) errors.rule = "ruleRequired";
  return errors;
}
