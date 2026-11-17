"use client";

import { CalendarTimeZoneNote } from "@app/ui";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** Zone des Geräts; auf dem Server unbekannt. */
export function useDeviceTimeZone(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}

/** Text des Hinweises, wenn das Gerät in einer anderen Zone steht als der Kalender (PRD 11.5), sonst `undefined`. */
export function useZoneNote(timeZone: string): string | undefined {
  const t = useTranslations("bookingStudio");
  const device = useDeviceTimeZone();
  return device && device !== timeZone
    ? t("zoneNote", { zone: timeZone, device })
    : undefined;
}

export function ZoneNote({ timeZone }: { timeZone: string }) {
  const note = useZoneNote(timeZone);
  return note ? <CalendarTimeZoneNote>{note}</CalendarTimeZoneNote> : null;
}
