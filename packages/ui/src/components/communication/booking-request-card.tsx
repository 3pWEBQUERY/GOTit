"use client";

import { CalendarClock, CalendarX, CircleCheck, CircleX, Hourglass, Repeat } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { Button } from "../actions/button";

export type BookingRequestStatusKind = "pending" | "accepted" | "countered" | "declined" | "cancelled" | "expired";

export interface BookingRequestDetail {
  key: string;
  /** Bezeichnung, zum Beispiel «Datum», «Uhrzeit», «Dauer», «Region». */
  label: string;
  /** Fertiger Wert, zum Beispiel «Do, 19.11.2026». */
  value: string;
}

export type BookingRequestAction = "accept" | "counter" | "decline";

export interface BookingRequestCardProps {
  title: string;
  details: readonly BookingRequestDetail[];
  /** Status als Wort; das Icon folgt aus `kind`. */
  status: { kind: BookingRequestStatusKind; label: string };
  /** Eigene Aktionen. Ersetzt die fertigen Buttons. */
  actions?: ReactNode;
  /** Die fertigen Buttons erscheinen nur, wenn ihr Callback gesetzt ist. */
  onAccept?: () => void;
  onCounter?: () => void;
  onDecline?: () => void;
  /** Beschriftungen der fertigen Buttons: «Anfrage zusagen», «Gegenvorschlag senden», «Anfrage ablehnen». */
  labels?: Record<BookingRequestAction, string>;
  /** Zeigt an diesem Button den Ladezustand und sperrt die anderen. */
  busy?: BookingRequestAction;
  /** Link zur Anfrage, zum Beispiel «Anfrage ansehen». */
  view?: { label: string; href: string };
  className?: string;
}

const statusIcons = {
  pending: Hourglass,
  accepted: CircleCheck,
  countered: Repeat,
  declined: CircleX,
  cancelled: CalendarX,
  expired: CalendarClock,
} as const;

/**
 * Terminanfrage als Karte im Verlauf (PRD 11.4): Thread und Anfrage sind zwei
 * Ansichten desselben Vorgangs, die Anfrage lässt sich hier beantworten.
 */
export function BookingRequestCard({ title, details, status, actions, onAccept, onCounter, onDecline, labels, busy, view, className }: BookingRequestCardProps) {
  const StatusIcon = statusIcons[status.kind];
  const hasButtons = !actions && labels && (onAccept || onCounter || onDecline);

  return (
    <div data-status={status.kind} className={cn("flex flex-col gap-3 rounded-card border border-border bg-surface p-4 text-ink", className)}>
      <div className="flex flex-col gap-1">
        <p className="text-body font-[600]">{title}</p>
        <p className="flex items-center gap-2 text-small">
          <StatusIcon aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-ink-muted" />
          {status.label}
        </p>
      </div>
      <dl className="tabular grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-small">
        {details.map((detail) => (
          <div key={detail.key} className="contents">
            <dt className="text-ink-muted">{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
      </dl>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      {hasButtons ? (
        <div className="flex flex-wrap gap-2">
          {onAccept ? (
            <Button variant="primary" loading={busy === "accept"} disabled={busy !== undefined && busy !== "accept"} onClick={onAccept}>
              {labels.accept}
            </Button>
          ) : null}
          {onCounter ? (
            <Button loading={busy === "counter"} disabled={busy !== undefined && busy !== "counter"} onClick={onCounter}>
              {labels.counter}
            </Button>
          ) : null}
          {onDecline ? (
            <Button variant="quiet" loading={busy === "decline"} disabled={busy !== undefined && busy !== "decline"} onClick={onDecline}>
              {labels.decline}
            </Button>
          ) : null}
        </div>
      ) : null}
      {view ? (
        <UiLink href={view.href} className="inline-flex min-h-11 items-center self-start text-small font-[550] underline underline-offset-4">
          {view.label}
        </UiLink>
      ) : null}
    </div>
  );
}
