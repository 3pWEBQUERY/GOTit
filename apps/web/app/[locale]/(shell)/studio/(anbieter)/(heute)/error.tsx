"use client";

import { TodayError } from "@/features/studio-today/components/states";

export default function TodayErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <TodayError reset={reset} />;
}
