"use client";

import { ImagePlus, PenLine } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { TextArea } from "../input/text-area";

export interface PostComposerLabels {
  /** Label des Textfelds, zum Beispiel «Dein Beitrag». */
  field: string;
  /** Verb + Objekt, zum Beispiel «Beitrag senden». */
  submit: string;
  /** Zum Beispiel «Bild anhängen». Nur nötig mit `onAttach`. */
  attach?: string;
  /** Text der einzeiligen Einstiegs-Schaltfläche, zum Beispiel «Beitrag schreiben …». Nur nötig mit `compact`. */
  open?: string;
  /** Zum Beispiel «Entwurf schliessen». Klappt die kompakte Variante wieder zu; der Text bleibt erhalten. */
  collapse?: string;
}

export interface PostComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  labels: PostComposerLabels;
  /** Fehler am Feld, zum Beispiel «Schreib mindestens einen Satz.» Der Senden-Button bleibt aktiv und die App erklärt hier, was fehlt. */
  error?: ReactNode;
  /** Hinweis am Fuss, zum Beispiel «Wird vor der Veröffentlichung geprüft». */
  notice?: ReactNode;
  maxLength?: number;
  /** Text des Zeichenzählers, zum Beispiel «120 von 500 Zeichen». */
  countLabel?: (used: number, max: number) => string;
  placeholder?: string;
  /** Öffnet die Dateiauswahl der App. Das Hochladen übernimmt die App. */
  onAttach?: () => void;
  /** Vorschau des angehängten Bilds (mit eigener «Entfernen»-Aktion der App). */
  preview?: ReactNode;
  /** Der Beitrag wird gerade gesendet. */
  pending?: boolean;
  /** Startet als einzeilige Schaltfläche, die das Formular aufklappt. */
  compact?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

/** «Beitrag schreiben»: Textfeld mit Zeichenzähler, optionalem Bild und Hinweis zur Moderation. Kontrolliert. */
export function PostComposer({ value, onValueChange, onSubmit, labels, error, notice, maxLength, countLabel, placeholder, onAttach, preview, pending, compact, defaultExpanded, className }: PostComposerProps) {
  const [expanded, setExpanded] = useState(!compact || Boolean(defaultExpanded) || value !== "");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<"field" | "opener" | null>(null);

  useEffect(() => {
    const target = focusTargetRef.current;
    focusTargetRef.current = null;
    if (target === "field") fieldRef.current?.focus();
    if (target === "opener") openerRef.current?.focus();
  }, [expanded]);

  const toggle = (next: boolean) => {
    focusTargetRef.current = next ? "field" : "opener";
    setExpanded(next);
  };

  if (compact && !expanded) {
    return (
      <button
        ref={openerRef}
        type="button"
        aria-expanded={false}
        onClick={() => toggle(true)}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-control border border-border-strong bg-surface px-3 text-left text-body text-ink-muted transition-colors duration-state hover:border-ink",
          className,
        )}
      >
        <PenLine aria-hidden strokeWidth={1.5} className="size-5 shrink-0" />
        <span>{labels.open}</span>
      </button>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pending) onSubmit();
  };

  return (
    <form noValidate onSubmit={handleSubmit} className={cn("flex flex-col gap-3", className)}>
      <TextArea
        ref={fieldRef}
        label={labels.field}
        value={value}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        error={error}
        maxLength={maxLength}
        countLabel={countLabel}
        placeholder={placeholder}
        readOnly={pending}
        autoGrow
        rows={3}
      />
      {preview ? <div>{preview}</div> : null}
      {notice ? <p className="text-small text-ink-muted">{notice}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="-ml-3 flex flex-wrap items-center gap-1">
          {onAttach && labels.attach ? (
            <Button variant="quiet" icon={<ImagePlus aria-hidden strokeWidth={1.5} />} onClick={onAttach}>
              {labels.attach}
            </Button>
          ) : null}
          {compact && labels.collapse ? (
            <Button variant="quiet" onClick={() => toggle(false)}>
              {labels.collapse}
            </Button>
          ) : null}
        </div>
        <Button type="submit" variant="primary" loading={pending}>
          {labels.submit}
        </Button>
      </div>
    </form>
  );
}
