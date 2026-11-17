"use client";

import { BookingStudioError } from "@/features/booking/studio/states/studio-states";

export default function BookingStudioErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <BookingStudioError reset={reset} />;
}
