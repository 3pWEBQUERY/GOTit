"use client";

import type { BookingActionInput } from "@app/core/booking/schemas";
import { useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  actOnBookingRequestAction,
  type BookingActionResult,
} from "../../actions/act";
import { counterAtLocalTimeAction } from "../../actions/counter";
import { needsRefresh, type ActFailure } from "../../lib/errors";

export type ActionFailure = ActFailure | "network";

export type LocalCounter = {
  day: string;
  time: string;
  durationMinutes: number;
};

/**
 * Führt eine Aktion auf einer Anfrage aus: Erfolg als Toast, danach frischer
 * Stand vom Server (die Gegenseite erhält ihn über die Echtzeit). Ein Problem
 * bleibt als Text beim Auslöser; ändert sich der Stand, lädt die Ansicht neu.
 */
export function useBookingAction(requestId: string) {
  const t = useTranslations("booking.act");
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  async function settle(
    key: string,
    run: () => Promise<BookingActionResult>,
  ): Promise<boolean> {
    setBusy(key);
    setFailure(null);
    const result = await run().catch((): { ok: false; reason: "network" } => ({
      ok: false,
      reason: "network",
    }));
    setBusy(null);
    if (result.ok) {
      toast({ title: t(`done.${key}`), tone: "success" });
      router.refresh();
      return true;
    }
    setFailure(result.reason);
    if (result.reason !== "network" && needsRefresh(result.reason))
      router.refresh();
    return false;
  }

  return {
    busy,
    failure,
    message: failure ? t(`errors.${failure}`) : null,
    clear: () => setFailure(null),
    run: (input: BookingActionInput) =>
      settle(input.action, () => actOnBookingRequestAction(requestId, input)),
    counterLocal: (input: LocalCounter) =>
      settle("counter", () => counterAtLocalTimeAction(requestId, input)),
  };
}
