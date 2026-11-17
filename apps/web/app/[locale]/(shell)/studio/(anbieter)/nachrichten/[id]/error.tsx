"use client";

import { MessengerError } from "@/features/messages/components/states/messenger-states";

export default function MessagesErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <MessengerError reset={reset} />;
}
