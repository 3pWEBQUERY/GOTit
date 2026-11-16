"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Button } from "../actions/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "../feedback/dialog";
import { InlineAlert } from "../feedback/inline-alert";
import { RadioGroup } from "../input/radio-group";
import { TextArea } from "../input/text-area";

export interface ReportReason {
  value: string;
  label: string;
  description?: string;
  /** Dringender Grund: Nach der Wahl erscheint der Hinweis aus `labels.urgentTitle`. */
  urgent?: boolean;
}

export interface ReportDialogLabels {
  /** Titel, zum Beispiel «Nachricht melden». */
  title: string;
  description?: string;
  close: string;
  /** Frage über den Gründen, zum Beispiel «Was trifft zu?». */
  reasonLegend: string;
  /** Fehler, wenn ohne Grund weitergegangen wird. */
  reasonMissing: string;
  /** Hinweis bei dringendem Grund, zum Beispiel wohin man sich bei akuter Gefahr wendet. */
  urgentTitle: string;
  urgentText?: ReactNode;
  /** Button zu Schritt 2, zum Beispiel «Beschreibung ergänzen». */
  next: string;
  /** Button zurück zu Schritt 1, zum Beispiel «Grund ändern». */
  back: string;
  detailsLabel: string;
  detailsHint?: string;
  /** Kennzeichnung des optionalen Felds, in der Regel «optional». */
  optional: string;
  /** Button zum Senden, zum Beispiel «Meldung senden». */
  submit: string;
  sentTitle: string;
  sentText?: ReactNode;
  /** Button nach dem Senden, zum Beispiel «Dialog schliessen». */
  done: string;
  /** Fehler beim Senden: was passiert ist und dass die Eingaben erhalten sind. */
  errorTitle: string;
  errorText?: ReactNode;
  /** Schrittanzeige, zum Beispiel «Schritt 1 von 2». */
  step?: (current: number, total: number) => string;
}

export interface ReportSubmission {
  reason: string;
  /** Leer, wenn nichts beschrieben wurde. */
  details: string;
}

export interface ReportDialogProps {
  /** Auslöser, zum Beispiel ein stiller Button «Nachricht melden». Ohne Auslöser wird der Dialog über `open` gesteuert. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  reasons: readonly ReportReason[];
  labels: ReportDialogLabels;
  /** Sendet die Meldung. Lehnt das Promise ab, bleiben die Eingaben erhalten und der Fehler erscheint am Ort. */
  onSubmit: (report: ReportSubmission) => Promise<void>;
  /** Höchstlänge der Beschreibung. */
  maxLength?: number;
}

type Phase = "idle" | "submitting" | "sent" | "error";

function ReportSent({ title, text, doneLabel, doneRef, onDone }: { title: string; text: ReactNode; doneLabel: string; doneRef: RefObject<HTMLButtonElement | null>; onDone: () => void }) {
  return (
    <>
      <div role="status" className="flex items-start gap-3">
        <CircleCheck aria-hidden strokeWidth={1.5} className="mt-px size-5 shrink-0 text-ink-muted" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-body font-[550]">{title}</p>
          {text ? <div className="text-small text-ink-muted">{text}</div> : null}
        </div>
      </div>
      <DialogFooter>
        <Button ref={doneRef} variant="primary" onClick={onDone}>
          {doneLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Melden in höchstens zwei Schritten (PRD 10.1): Grund wählen, optional
 * beschreiben, senden. Wird der Dialog vor dem Senden geschlossen, bleiben die
 * Eingaben bis zum nächsten Öffnen stehen; nach dem Senden beginnt er neu.
 */
export function ReportDialog({ trigger, open, onOpenChange, reasons, labels, onSubmit, maxLength = 1000 }: ReportDialogProps) {
  const [innerOpen, setInnerOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const bodyRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const isOpen = open ?? innerOpen;
  const sent = phase === "sent";
  const urgent = reasons.find((item) => item.value === reason)?.urgent === true;

  // Beim Wechsel des Schritts verschwindet der gedrückte Button; der Fokus geht zum ersten Bedienelement des neuen Inhalts.
  useEffect(() => {
    if (sent) doneRef.current?.focus();
    else if (step === 2) detailsRef.current?.focus();
    else bodyRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"], [role="radio"]')?.focus();
  }, [step, sent]);

  function setOpen(next: boolean) {
    if (!next && phase === "submitting") return;
    // Nach einer gesendeten Meldung beginnt das nächste Öffnen neu.
    if (next && sent) {
      setStep(1);
      setReason("");
      setDetails("");
      setPhase("idle");
    }
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }

  function goNext() {
    if (!reason) {
      setReasonError(true);
      return;
    }
    setStep(2);
  }

  async function submit() {
    setPhase("submitting");
    try {
      await onSubmit({ reason, details: details.trim() });
      setPhase("sent");
    } catch {
      setPhase("error");
    }
  }

  const stepText = labels.step ? <p className="tabular text-small text-ink-muted">{labels.step(step, 2)}</p> : null;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent title={labels.title} description={sent ? undefined : labels.description} closeLabel={labels.close}>
        <div ref={bodyRef} className="flex flex-col gap-4">
          {sent ? (
            <ReportSent title={labels.sentTitle} text={labels.sentText} doneLabel={labels.done} doneRef={doneRef} onDone={() => setOpen(false)} />
          ) : step === 1 ? (
            <>
              {stepText}
              <RadioGroup
                label={labels.reasonLegend}
                options={reasons}
                value={reason}
                onValueChange={(value) => {
                  setReason(value);
                  setReasonError(false);
                }}
                error={reasonError ? labels.reasonMissing : undefined}
              />
              {urgent ? (
                <InlineAlert tone="warning" title={labels.urgentTitle}>
                  {labels.urgentText}
                </InlineAlert>
              ) : null}
              <DialogFooter>
                <Button variant="primary" onClick={goNext}>
                  {labels.next}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {stepText}
              {phase === "error" ? (
                <InlineAlert tone="error" title={labels.errorTitle}>
                  {labels.errorText}
                </InlineAlert>
              ) : null}
              <TextArea
                ref={detailsRef}
                label={labels.detailsLabel}
                hint={labels.detailsHint}
                optionalLabel={labels.optional}
                value={details}
                onChange={(event) => setDetails(event.currentTarget.value)}
                maxLength={maxLength}
                readOnly={phase === "submitting"}
                autoGrow
              />
              <DialogFooter>
                <Button disabled={phase === "submitting"} onClick={() => setStep(1)}>
                  {labels.back}
                </Button>
                <Button variant="primary" loading={phase === "submitting"} onClick={() => void submit()}>
                  {labels.submit}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
