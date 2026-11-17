"use client";

import type { BookingAction } from "@app/core/booking";
import { REASON_MAX } from "@app/core/booking/schemas";
import { Button, InlineAlert, TextArea, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  actOnBookingRequestAction,
  type BookingActionResult,
} from "../../actions/act";
import type { RequestView } from "../queries/request-view";
import { CounterForm } from "./counter-form";
import {
  RestrictionNotice,
  type RestrictionInfo,
} from "../../../moderation/restriction-notice";

type Confirmable = "decline" | "cancel" | "cancel-safety" | "dispute";
type Mode =
  | { kind: "idle" }
  | { kind: "counter" }
  | { kind: "confirm"; action: Confirmable };

const LABEL: Record<BookingAction, string> = {
  accept: "accept",
  counter: "counter",
  decline: "decline",
  cancel: "cancel",
  "cancel-safety": "cancelSafety",
  complete: "complete",
  dispute: "dispute",
};

const DONE: Record<BookingAction, string> = {
  accept: "accepted",
  counter: "countered",
  decline: "declined",
  cancel: "cancelled",
  "cancel-safety": "cancelled",
  complete: "completed",
  dispute: "disputed",
};

/** Fehler einer Aktion in Klartext (PRD 13: was passiert ist und was jetzt geht). */
export function useActionError() {
  const t = useTranslations("bookingStudio.request.errors");
  return (
    result: Exclude<BookingActionResult, { ok: true }>,
  ): { title?: string; text: string; restricted?: RestrictionInfo } => {
    switch (result.reason) {
      case "restricted":
        return { text: t("restricted"), restricted: { until: result.until ?? null } };
      case "conflict":
        return { title: t("conflictTitle"), text: t("conflict") };
      case "stale":
        return { text: t("stale") };
      case "not-allowed":
      case "not-found":
        return { text: t("notAllowed") };
      case "invalid":
      case "unavailable":
        return { text: t("invalid") };
      case "rate-limited":
        return { text: t("rateLimited") };
      default:
        return { text: t("failed") };
    }
  };
}

/**
 * Antworten auf eine Terminanfrage (v2 11.5). Nicht Umkehrbares (ablehnen,
 * absagen, strittig) verlangt einen Bestätigungsschritt, der die Folge nennt.
 * Er steht an Ort und Stelle statt in einem Dialog, weil die Aktionen auch im
 * Seitenpanel des Kalenders stehen (PRD 13: keine Dialoge in Dialogen).
 */
export function RequestActions({
  request,
  headingLevel,
  safetyOffer,
}: {
  request: RequestView;
  headingLevel: 2 | 3;
  safetyOffer: (open: boolean) => ReactNode;
}) {
  const t = useTranslations("bookingStudio.request");
  const router = useRouter();
  const { toast } = useToast();
  const describeError = useActionError();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [pending, setPending] = useState<BookingAction | null>(null);
  const [error, setError] = useState<{
    title?: string;
    text: string;
    restricted?: RestrictionInfo;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [safetyDone, setSafetyDone] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const StepHeading = headingLevel === 2 ? "h3" : "h4";

  useEffect(() => {
    if (mode.kind !== "idle") stepHeading.current?.focus();
  }, [mode]);

  async function run(action: Exclude<BookingAction, "counter">) {
    setPending(action);
    setError(null);
    const input =
      action === "accept" || action === "complete"
        ? { action }
        : { action, reason };
    const result = await actOnBookingRequestAction(request.id, input).catch(
      (): BookingActionResult => ({ ok: false, reason: "invalid" }),
    );
    setPending(null);
    if (!result.ok) {
      setError(describeError(result));
      if (result.reason === "stale" || result.reason === "not-allowed")
        router.refresh();
      return;
    }
    toast({ title: t(DONE[action]), tone: "success" });
    setMode({ kind: "idle" });
    setReason("");
    if (action === "cancel-safety") setSafetyDone(true);
    router.refresh();
  }

  const visible = request.actions;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
      data-request-actions
    >
      <Heading id={headingId} className="text-h3">
        {t("actionsTitle")}
      </Heading>
      {safetyDone ? safetyOffer(true) : null}
      {error?.restricted ? (
        <RestrictionNotice kind="BOOKING" restriction={error.restricted} />
      ) : error ? (
        <InlineAlert tone="error" title={error.title ?? error.text}>
          {error.title ? error.text : null}
        </InlineAlert>
      ) : null}
      {visible.length === 0 && !safetyDone ? (
        <p className="text-small text-ink-muted">{t("noActions")}</p>
      ) : null}
      {mode.kind === "idle" && visible.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {visible.map((action) =>
            action === "counter" ? (
              <Button key={action} onClick={() => setMode({ kind: "counter" })}>
                {t("counter")}
              </Button>
            ) : action === "accept" || action === "complete" ? (
              <Button
                key={action}
                variant={action === "accept" ? "primary" : "secondary"}
                loading={pending === action}
                onClick={() => void run(action)}
              >
                {t(LABEL[action])}
              </Button>
            ) : (
              <Button
                key={action}
                variant="quiet"
                onClick={() => setMode({ kind: "confirm", action })}
              >
                {t(LABEL[action])}
              </Button>
            ),
          )}
        </div>
      ) : null}
      {mode.kind === "counter" ? (
        <div className="flex flex-col gap-3 rounded-card border border-border p-4">
          <StepHeading
            ref={stepHeading}
            tabIndex={-1}
            className="text-body font-[600] outline-none"
          >
            {t("counterForm.title")}
          </StepHeading>
          <CounterForm
            request={request}
            onCancel={() => setMode({ kind: "idle" })}
            onDone={(result) => {
              if (!result.ok) {
                setError(describeError(result));
                if (
                  result.reason === "stale" ||
                  result.reason === "not-allowed"
                )
                  router.refresh();
                return;
              }
              setError(null);
              toast({ title: t("countered"), tone: "success" });
              setMode({ kind: "idle" });
              router.refresh();
            }}
          />
        </div>
      ) : null}
      {mode.kind === "confirm" ? (
        <ConfirmStep
          action={mode.action}
          headingRef={stepHeading}
          headingTag={StepHeading}
          reason={reason}
          onReasonChange={setReason}
          pending={pending === mode.action}
          disabled={pending !== null}
          onAbort={() => {
            setMode({ kind: "idle" });
            setReason("");
          }}
          onConfirm={() => void run(mode.action)}
        />
      ) : null}
    </section>
  );
}

/** Rückfrage am Ort: Titel, Folge, optionaler Grund und der Button mit Verb und Objekt (PRD 13). */
function ConfirmStep({
  action,
  headingRef,
  headingTag: StepHeading,
  reason,
  onReasonChange,
  pending,
  disabled,
  onAbort,
  onConfirm,
}: {
  action: Confirmable;
  headingRef: RefObject<HTMLHeadingElement | null>;
  headingTag: "h3" | "h4";
  reason: string;
  onReasonChange: (value: string) => void;
  pending: boolean;
  disabled: boolean;
  onAbort: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("bookingStudio.request");
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-card border border-border-strong p-4"
      data-confirm-step={action}
    >
      <StepHeading
        id={id}
        ref={headingRef}
        tabIndex={-1}
        className="text-body font-[600] outline-none"
      >
        {t(`confirm.${LABEL[action]}Title`)}
      </StepHeading>
      <p className="text-small text-ink-muted">
        {t(`confirm.${LABEL[action]}Text`)}
      </p>
      <TextArea
        label={t("reason")}
        optionalLabel={t("optional")}
        hint={t("reasonHint")}
        value={reason}
        maxLength={REASON_MAX}
        onChange={(event) => onReasonChange(event.currentTarget.value)}
        autoGrow
      />
      <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
        <Button disabled={disabled} onClick={onAbort}>
          {t("abort")}
        </Button>
        <Button variant="destructive" loading={pending} onClick={onConfirm}>
          {t(LABEL[action])}
        </Button>
      </div>
    </div>
  );
}
