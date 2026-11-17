"use client";

import { ClubError } from "@/features/clubs/components/club-states";

export default function ClubsErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ClubError reset={reset} />;
}
