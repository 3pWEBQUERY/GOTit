import { Ban, CheckCheck, CircleCheck, CircleDashed, CircleX, MessagesSquare, TimerOff, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "../../cn";

/** Die acht Status einer Terminanfrage (PRD 11.5). */
export const BOOKING_STATUSES = ["requested", "negotiating", "confirmed", "declined", "cancelled", "expired", "completed", "disputed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const statusIcons: Record<BookingStatus, LucideIcon> = {
  requested: CircleDashed,
  negotiating: MessagesSquare,
  confirmed: CircleCheck,
  declined: CircleX,
  cancelled: Ban,
  expired: TimerOff,
  completed: CheckCheck,
  disputed: TriangleAlert,
};

const iconTone: Partial<Record<BookingStatus, string>> = {
  declined: "text-warning",
  disputed: "text-error",
};

/** Icon eines Terminstatus. Dekorativ; das Wort steht daneben. */
export function BookingStatusIcon({ status, className }: { status: BookingStatus; className?: string }) {
  const Icon = statusIcons[status];
  return <Icon aria-hidden strokeWidth={1.5} className={cn("size-[1.125rem] shrink-0", iconTone[status], className)} />;
}

export interface StatusPillProps {
  status: BookingStatus;
  /** Der Status als Wort, zum Beispiel «Bestätigt». */
  label: string;
  className?: string;
}

/**
 * Status einer Terminanfrage als Icon und Wort, nie nur über Farbe. Der Ton bleibt neutral;
 * nur «bestätigt» trägt einen Akzent-Rand, «abgelehnt» und «strittig» färben allein das Icon.
 */
export function StatusPill({ status, label, className }: StatusPillProps) {
  return (
    <span
      data-status={status}
      className={cn("inline-flex min-h-6 items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-label text-ink", status === "confirmed" && "border-accent", className)}
    >
      <BookingStatusIcon status={status} />
      <span>{label}</span>
    </span>
  );
}
