"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import {
  durationParts,
  formatRange,
  formatStamp,
  zoneSuffix,
} from "../../lib/format";
import { useViewerZone } from "./use-viewer-zone";

/**
 * Zeiten in der Zone des Anbieters, mit ihrem Namen, wenn der Browser in
 * einer anderen Zone läuft (v2 11.5), und Dauern als Wörter.
 */
export function useBookingFormat(timeZone: string) {
  const locale = useLocale();
  const t = useTranslations("booking.duration");
  const viewerZone = useViewerZone();
  const range = useCallback(
    (start: string, end: string) =>
      `${formatRange(start, end, timeZone, locale)}${zoneSuffix(start, timeZone, viewerZone, locale)}`,
    [timeZone, locale, viewerZone],
  );
  const stamp = useCallback(
    (iso: string) =>
      `${formatStamp(iso, timeZone, locale)}${zoneSuffix(iso, timeZone, viewerZone, locale)}`,
    [timeZone, locale, viewerZone],
  );
  const duration = useCallback(
    (minutes: number) => {
      const parts = durationParts(minutes);
      if (parts.hours === 0) return t("minutes", { minutes: parts.minutes });
      if (parts.minutes === 0) return t("hours", { hours: parts.hours });
      return t("hoursMinutes", { hours: parts.hours, minutes: parts.minutes });
    },
    [t],
  );
  return {
    range,
    stamp,
    duration,
    zone: zoneSuffix(new Date().toISOString(), timeZone, viewerZone, locale)
      .trim()
      .replace(/^\(|\)$/g, ""),
  };
}
