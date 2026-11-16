"use client";

import { ChevronDown } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useComposedRefs } from "radix-ui/internal";
import { useEffect, useId, useRef, useState, type FocusEventHandler, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { comboboxNavigate } from "./combobox-keys";
import { ComboboxList, comboboxOptionId, type ComboboxOption } from "./combobox-list";
import { ControlFrame, controlInputClass } from "./control-frame";
import { Field } from "./field";

export interface ComboboxProps {
  label: ReactNode;
  options: readonly ComboboxOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** Meldet den getippten Text, zum Beispiel um Vorschläge vom Server zu laden. */
  onQueryChange?: (query: string) => void;
  /** `"local"` filtert `options` nach dem getippten Text; `"none"`, wenn die App die Liste selbst filtert. */
  filter?: "local" | "none";
  /** Text, wenn es keine Treffer gibt. */
  emptyLabel: string;
  loading?: boolean;
  /** Text während des Ladens; wird auch vorgelesen. */
  loadingLabel?: string;
  /** Name des versteckten Felds, das den gewählten Wert im Formular trägt. */
  name?: string;
  placeholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  id?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * Eingabe mit filterbarer Liste nach dem Combobox-Muster von WAI-ARIA:
 * Pfeiltasten bewegen die Markierung, Enter wählt, Escape schliesst, Home und End springen.
 */
export function Combobox({ label, options, value, onValueChange, onQueryChange, filter = "local", emptyLabel, loading, loadingLabel, name, placeholder, hint, error, optionalLabel, hideLabel, disabled, id, onBlur, ref, className }: ComboboxProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const composedRef = useComposedRefs(ref, inputRef);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  /** `null`: es wird nicht getippt, das Feld zeigt die Auswahl. */
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lastSelected, setLastSelected] = useState<ComboboxOption | null>(null);

  const selected = options.find((option) => option.value === value) ?? (lastSelected?.value === value ? lastSelected : null);
  const needle = (query ?? "").trim().toLocaleLowerCase();
  const visible = filter === "local" && needle ? options.filter((option) => option.label.toLocaleLowerCase().includes(needle)) : options;
  const activeId = open && activeIndex >= 0 && activeIndex < visible.length ? comboboxOptionId(listId, activeIndex) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };
  const select = (option: ComboboxOption) => {
    setLastSelected(option);
    setQuery(null);
    close();
    if (option.value !== value) onValueChange(option.value);
  };
  const openWith = (index: number) => {
    setOpen(true);
    setActiveIndex(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const target = comboboxNavigate(event.key, visible, { open, activeIndex, value });
    if (target !== null) {
      event.preventDefault();
      openWith(target);
    } else if (event.key === "Enter" && open) {
      const option = visible[activeIndex];
      event.preventDefault();
      if (option && !option.disabled) select(option);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setQuery(null);
      close();
    }
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
    if (query !== null && query.trim() === "" && value !== null) onValueChange(null);
    setQuery(null);
    close();
    onBlur?.(event);
  };

  const status = open ? (loading ? (loadingLabel ?? "") : visible.length === 0 ? emptyLabel : "") : "";

  return (
    <Field label={label} hint={hint} error={error} optionalLabel={optionalLabel} hideLabel={hideLabel} id={id} className={className}>
      {(control, parts) => (
        <PopoverPrimitive.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
          <PopoverPrimitive.Anchor asChild>
            <ControlFrame
              ref={anchorRef}
              invalid={Boolean(error)}
              disabled={disabled}
              suffix={<ChevronDown aria-hidden strokeWidth={1.5} className="mr-3" />}
              onMouseDown={(event) => {
                if (event.target !== inputRef.current) event.preventDefault();
                if (!disabled) inputRef.current?.focus();
              }}
            >
              <input
                {...control}
                ref={composedRef}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                autoComplete="off"
                placeholder={placeholder}
                disabled={disabled}
                value={query ?? selected?.label ?? ""}
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                  openWith(0);
                  onQueryChange?.(event.currentTarget.value);
                }}
                onClick={() => (open ? undefined : openWith(-1))}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className={controlInputClass}
              />
            </ControlFrame>
          </PopoverPrimitive.Anchor>
          {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
          <span role="status" className="sr-only">
            {status}
          </span>
          <ComboboxList
            id={listId}
            labelId={parts.labelId}
            anchorRef={anchorRef}
            options={visible}
            selectedValue={value}
            activeIndex={activeIndex}
            emptyLabel={emptyLabel}
            loading={loading}
            loadingLabel={loadingLabel}
            onSelect={select}
            onActiveChange={setActiveIndex}
          />
        </PopoverPrimitive.Root>
      )}
    </Field>
  );
}
