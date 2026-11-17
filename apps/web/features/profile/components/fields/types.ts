import type { SectionErrors } from "../editor/use-section-errors";

/** Gemeinsame Props der Felder eines Abschnitts. */
export interface FieldsProps<Value> {
  value: Value;
  onChange: (next: Value) => void;
  errors: SectionErrors;
  /** Prüft ein Feld beim Verlassen (PRD 13: nicht beim Tippen). */
  onBlurField: (path: string) => void;
  disabled?: boolean;
}
