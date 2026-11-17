"use client";

import {
  REPORT_REASONS,
  URGENT_REPORT_REASONS,
} from "@app/core/messaging/schemas";
import type { ReportDialogLabels, ReportReason } from "@app/ui";
import { useTranslations } from "next-intl";

/** Gründe und Texte des Meldedialogs, für eine Nachricht oder die Gegenseite. */
export function useReportDialog(target: "message" | "counterpart"): {
  reasons: ReportReason[];
  labels: ReportDialogLabels;
} {
  const t = useTranslations("messages.report");
  return {
    reasons: REPORT_REASONS.map((reason) => ({
      value: reason,
      label: t(`reasons.${reason}`),
      urgent: URGENT_REPORT_REASONS.includes(reason),
    })),
    labels: {
      title: target === "message" ? t("titleMessage") : t("titleCounterpart"),
      description:
        target === "message"
          ? t("descriptionMessage")
          : t("descriptionCounterpart"),
      close: t("close"),
      reasonLegend: t("reasonLegend"),
      reasonMissing: t("reasonMissing"),
      urgentTitle: t("urgentTitle"),
      urgentText: t("urgentText"),
      next: t("next"),
      back: t("back"),
      detailsLabel: t("detailsLabel"),
      detailsHint: t("detailsHint"),
      optional: t("optional"),
      submit: t("submit"),
      sentTitle: t("sentTitle"),
      sentText: t("sentText"),
      done: t("done"),
      errorTitle: t("errorTitle"),
      errorText: t("errorText"),
      step: (current, total) => t("step", { current, total }),
    },
  };
}
