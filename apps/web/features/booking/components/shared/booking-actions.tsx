"use client";

import type { BookingAction } from "@app/core/booking";
import { Button, ReportDialog, cn } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { reportCounterpartAction } from "../../../messages/actions/safety";
import { useReportDialog } from "../../../messages/components/thread/report-labels";
import type { ClientBooking, ClientSlots } from "../../lib/types";
import { CounterDialog } from "./counter-dialog";
import { ReasonDialog, type ReasonKind } from "./reason-dialog";
import { RestrictionNotice } from "../../../moderation/restriction-notice";
import { useBookingAction } from "./use-booking-action";

export interface BookingActionsProps {
  booking: ClientBooking;
  slots: ClientSlots | null;
  className?: string;
}

const ORDER: readonly BookingAction[] = [
  "accept",
  "counter",
  "complete",
  "decline",
  "cancel",
  "dispute",
  "cancel-safety",
];

/**
 * Was die betrachtende Seite jetzt tun darf (der Kern entscheidet, v1
 * FR-BOOKING-003). Annehmen und «Stattgefunden» gehen direkt, Endgültiges
 * fragt mit benannter Folge nach. «Aus Sicherheitsgründen absagen» bietet
 * danach das Melden an (v2 11.5), nicht als Dialog im Dialog, sondern danach.
 */
export function BookingActions({
  booking,
  slots,
  className,
}: BookingActionsProps) {
  const t = useTranslations("booking.act");
  const action = useBookingAction(booking.id);
  const report = useReportDialog("counterpart");
  const [counterOpen, setCounterOpen] = useState(false);
  const [confirming, setConfirming] = useState<ReasonKind | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const reportNext = useRef(false);
  const allowed = ORDER.filter((entry) => booking.actions.includes(entry));
  // Nach der Absage gibt es keine Aktionen mehr; das Melden bleibt bis zum Schliessen offen.
  if (allowed.length === 0 && !reportOpen) return null;
  const confirmed = booking.status === "CONFIRMED";
  const label = (entry: BookingAction): string => {
    if (entry === "accept")
      return t(booking.status === "REQUESTED" ? "accept" : "acceptProposal");
    if (entry === "cancel") return t(confirmed ? "cancelConfirmed" : "cancel");
    if (entry === "cancel-safety") return t("cancelSafety");
    return t(entry);
  };
  const open = (entry: BookingAction) => {
    action.clear();
    if (entry === "accept" || entry === "complete")
      void action.run({ action: entry });
    else if (entry === "counter") setCounterOpen(true);
    else if (entry === "decline") setConfirming("decline");
    else if (entry === "cancel")
      setConfirming(confirmed ? "cancelConfirmed" : "cancel");
    else if (entry === "cancel-safety") setConfirming("cancelSafety");
    else setConfirming("dispute");
  };
  const dialogOpen = counterOpen || confirming !== null;

  return (
    <div className={cn("flex flex-col gap-2", className)} data-booking-actions>
      <div className="flex flex-wrap gap-2">
        {allowed.map((entry) => (
          <Button
            key={entry}
            variant={
              entry === "accept" ||
              (entry === "complete" && !allowed.includes("accept"))
                ? "primary"
                : entry === "cancel-safety"
                  ? "quiet"
                  : "secondary"
            }
            loading={action.busy === entry && !dialogOpen}
            disabled={action.busy !== null && action.busy !== entry}
            onClick={() => open(entry)}
          >
            {label(entry)}
          </Button>
        ))}
      </div>
      {action.restriction && !dialogOpen ? (
        <RestrictionNotice kind="BOOKING" restriction={action.restriction} />
      ) : action.message && !dialogOpen ? (
        <p role="alert" className="text-small text-error">
          {action.message}
        </p>
      ) : null}
      {counterOpen ? (
        <CounterDialog
          booking={booking}
          slots={slots}
          open
          onOpenChange={(next) => {
            setCounterOpen(next);
            if (!next) action.clear();
          }}
          onSlot={(startsAt, durationMinutes) =>
            action.run({ action: "counter", startsAt, durationMinutes })
          }
          onLocal={action.counterLocal}
          busy={action.busy === "counter"}
          failure={action.message}
        />
      ) : null}
      <ReasonDialog
        kind={confirming}
        counterpartName={booking.counterpartName}
        failure={action.message}
        onOpenChange={(next) => {
          if (!next) {
            setConfirming(null);
            action.clear();
            // Erst schliessen, dann melden: kein Dialog im Dialog, der Fokus landet im neuen Dialog.
            if (reportNext.current) {
              reportNext.current = false;
              window.setTimeout(() => setReportOpen(true), 0);
            }
          }
        }}
        onConfirm={async (reason) => {
          const kind = confirming;
          const entry =
            kind === "decline"
              ? "decline"
              : kind === "dispute"
                ? "dispute"
                : kind === "cancelSafety"
                  ? "cancel-safety"
                  : "cancel";
          const ok = await action.run({ action: entry, reason });
          if (ok && kind === "cancelSafety") reportNext.current = true;
          return ok;
        }}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reasons={report.reasons}
        labels={{
          ...report.labels,
          description: t("reportAfterSafety", {
            name: booking.counterpartName,
          }),
        }}
        onSubmit={async (submission) => {
          const result = await reportCounterpartAction(
            booking.conversationId,
            submission,
          );
          if (!result.ok) throw new Error(result.reason);
        }}
      />
    </div>
  );
}
