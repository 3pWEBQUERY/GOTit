"use client";

import { useComposedRefs } from "radix-ui/internal";
import { useId, useLayoutEffect, useRef, useState, type ChangeEvent, type ComponentPropsWithRef, type ReactNode } from "react";
import { cn } from "../../cn";
import { controlBoxClass } from "./control-frame";
import { Field } from "./field";

export interface TextAreaProps extends ComponentPropsWithRef<"textarea"> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  hideLabel?: boolean;
  /** Text des Zeichenzählers, zum Beispiel «120 von 500 Zeichen». Braucht `maxLength`. */
  countLabel?: (used: number, max: number) => string;
  /** Das Feld wächst mit dem Inhalt, statt zu scrollen. */
  autoGrow?: boolean;
}

function fitHeight(element: HTMLTextAreaElement | null) {
  if (!element || element.scrollHeight === 0) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight + 2}px`;
}

/** Mehrzeiliges Feld mit optionalem Zeichenzähler. */
export function TextArea({ label, hint, error, optionalLabel, hideLabel, countLabel, autoGrow, id, className, rows, ref, onChange, ...props }: TextAreaProps) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const composedRef = useComposedRefs(ref, innerRef);
  const countId = useId();
  const [ownLength, setOwnLength] = useState(() => String(props.defaultValue ?? "").length);
  const used = props.value === undefined ? ownLength : String(props.value).length;
  const showCount = countLabel !== undefined && props.maxLength !== undefined;

  useLayoutEffect(() => {
    if (autoGrow) fitHeight(innerRef.current);
  }, [autoGrow, props.value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setOwnLength(event.currentTarget.value.length);
    if (autoGrow) fitHeight(event.currentTarget);
    onChange?.(event);
  };

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      optionalLabel={optionalLabel}
      hideLabel={hideLabel}
      id={id}
      describedBy={[showCount ? countId : undefined, props["aria-describedby"]].filter(Boolean).join(" ") || undefined}
      className={className}
    >
      {(control) => (
        <>
          <textarea
            rows={rows ?? 4}
            {...props}
            {...control}
            ref={composedRef}
            onChange={handleChange}
            className={cn(controlBoxClass, "block px-3 py-2 read-only:bg-surface-2", autoGrow ? "resize-none overflow-hidden" : "resize-y")}
          />
          {showCount && props.maxLength !== undefined ? (
            <p id={countId} className="tabular self-end text-small text-ink-muted">
              {countLabel(used, props.maxLength)}
            </p>
          ) : null}
        </>
      )}
    </Field>
  );
}
