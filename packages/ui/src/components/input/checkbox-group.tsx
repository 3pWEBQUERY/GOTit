"use client";

import type { ReactNode } from "react";
import { FieldGroup } from "./field-group";

export interface CheckboxGroupProps {
  /** Text der `legend`. */
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  disabled?: boolean;
  className?: string;
  /** `Checkbox`-Elemente. */
  children: ReactNode;
}

/** Mehrere Kästchen unter einer gemeinsamen Frage (`fieldset` mit `legend`). */
export function CheckboxGroup({ children, ...props }: CheckboxGroupProps) {
  return (
    <FieldGroup {...props}>
      <div className="flex flex-col">{children}</div>
    </FieldGroup>
  );
}
