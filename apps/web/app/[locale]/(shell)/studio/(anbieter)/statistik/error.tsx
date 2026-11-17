"use client";

import { StatsError } from "@/features/stats/components/states";

export default function StatsErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <StatsError reset={reset} />;
}
