import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "../../cn";
import { ControlFrame, controlInputClass } from "./control-frame";
import { Field } from "./field";

export interface TextFieldProps extends Omit<ComponentPropsWithRef<"input">, "prefix"> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  hideLabel?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/**
 * Einzeiliges Feld. Reicht alle nativen Attribute durch (`name`, `ref`, `onChange`,
 * `onBlur`) und funktioniert damit direkt mit `register` von React Hook Form.
 */
export function TextField({ label, hint, error, optionalLabel, hideLabel, prefix, suffix, id, className, type, ...props }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} optionalLabel={optionalLabel} hideLabel={hideLabel} id={id} describedBy={props["aria-describedby"]} className={className}>
      {(control) => (
        <ControlFrame invalid={Boolean(error)} disabled={props.disabled} readOnly={props.readOnly} prefix={prefix} suffix={suffix ? <span className="pr-3">{suffix}</span> : null}>
          <input type={type ?? "text"} {...props} {...control} className={cn(controlInputClass, props.readOnly && "cursor-default")} />
        </ControlFrame>
      )}
    </Field>
  );
}
