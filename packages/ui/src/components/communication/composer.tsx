"use client";

import { SendHorizontal } from "lucide-react";
import { useId, useLayoutEffect, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../cn";
import { IconButton } from "../actions/icon-button";
import { controlBoxClass } from "../input/control-frame";

export interface ComposerProps {
  /** Der Text gehört der Ansicht: So bleibt er bei Verbindungsverlust oder Fehlern erhalten. */
  value: string;
  onValueChange: (value: string) => void;
  /** Wird mit Enter oder dem Senden-Button ausgelöst, nie bei leerem Text. Die Ansicht leert `value` nach Erfolg selbst. */
  onSend: () => void;
  /** Zugänglicher Name des Eingabefelds, zum Beispiel «Nachricht an Beispielname». */
  label: string;
  placeholder?: string;
  /** Zugänglicher Name des Senden-Buttons, zum Beispiel «Nachricht senden». */
  sendLabel: string;
  /** Hinweis unter dem Feld, zum Beispiel «Enter sendet, Umschalt + Enter fügt eine Zeile ein». */
  hint?: ReactNode;
  /** Platz links vom Feld, zum Beispiel für den `TemplatePicker`. */
  leading?: ReactNode;
  /** Sperrt Eingabe und Senden; der Text bleibt stehen. */
  disabled?: boolean;
  /** Begründung der Sperre, zum Beispiel «Du hast diese Person blockiert». */
  disabledReason?: ReactNode;
  /** Mobile Darstellung (PRD 5.5): unter 768 px unten fixiert, aus Glas, über der Safe Area. Ab 768 px unverändert im Fluss. */
  glass?: boolean;
  className?: string;
}

/**
 * Eingabe des Messengers. Das Feld wächst mit dem Inhalt; Enter sendet,
 * Umschalt + Enter fügt eine Zeile ein. Nichts wird ohne Zutun gesendet.
 */
export function Composer({ value, onValueChange, onSend, label, placeholder, sendLabel, hint, leading, disabled, disabledReason, glass, className }: ComposerProps) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const noteId = useId();
  const empty = value.trim() === "";
  const note = disabled ? disabledReason : hint;

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field || field.scrollHeight === 0) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight + 2}px`;
  }, [value]);

  function send() {
    if (disabled || empty) return;
    onSend();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  }

  return (
    <form
      onSubmit={onSubmit}
      data-glass={glass || undefined}
      className={cn(
        "relative flex flex-col gap-1 text-ink",
        glass && "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:px-3 max-md:pt-2 max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {glass ? <div aria-hidden className="glass absolute inset-0 md:hidden" /> : null}
      <div className="relative flex items-end gap-2">
        {leading}
        <textarea
          ref={fieldRef}
          rows={1}
          value={value}
          aria-label={label}
          aria-describedby={note ? noteId : undefined}
          placeholder={placeholder}
          disabled={disabled}
          enterKeyHint="send"
          onChange={(event) => onValueChange(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          className={cn(controlBoxClass, "block max-h-40 min-w-0 flex-1 resize-none px-3 py-2")}
        />
        <IconButton
          type="submit"
          variant="primary"
          label={sendLabel}
          icon={<SendHorizontal strokeWidth={1.5} />}
          disabled={disabled}
          aria-disabled={empty || undefined}
          className="aria-disabled:opacity-55"
        />
      </div>
      {note ? (
        <p id={noteId} className="relative px-1 text-small text-ink-muted">
          {note}
        </p>
      ) : null}
    </form>
  );
}
