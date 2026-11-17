"use client";

import { BookingError } from "@/features/booking/components/states/booking-states";

export default function AppointmentErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <BookingError reset={reset} />;
}
