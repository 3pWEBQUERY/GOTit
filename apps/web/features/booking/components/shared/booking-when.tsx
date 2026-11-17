"use client";

import { useBookingFormat } from "./use-booking-format";

/** Zeitraum eines Termins in der Zone des Anbieters; ihr Name steht dabei, wenn der Browser abweicht (v2 11.5). */
export function BookingWhen({
  startsAt,
  endsAt,
  timeZone,
  className,
}: {
  startsAt: string;
  endsAt: string;
  timeZone: string;
  className?: string;
}) {
  const format = useBookingFormat(timeZone);
  return (
    <time
      dateTime={startsAt}
      className={className ? `tabular ${className}` : "tabular"}
    >
      {format.range(startsAt, endsAt)}
    </time>
  );
}

/** Ein Zeitpunkt, zum Beispiel der Ablauf einer offenen Anfrage. */
export function BookingStamp({
  iso,
  timeZone,
}: {
  iso: string;
  timeZone: string;
}) {
  const format = useBookingFormat(timeZone);
  return (
    <time dateTime={iso} className="tabular">
      {format.stamp(iso)}
    </time>
  );
}

/** Dauer als Wort, zum Beispiel «1 Std. 30 Min.». */
export function BookingDuration({
  startsAt,
  endsAt,
  timeZone,
}: {
  startsAt: string;
  endsAt: string;
  timeZone: string;
}) {
  const format = useBookingFormat(timeZone);
  return (
    <>
      {format.duration(
        Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000),
      )}
    </>
  );
}
