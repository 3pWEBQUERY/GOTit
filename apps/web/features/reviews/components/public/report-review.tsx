"use client";

import { Button, ReportDialog, UiLink } from "@app/ui";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useReportDialog } from "../../../messages/components/thread/report-labels";
import { reportReviewAction } from "../../actions/report";

const quietLink =
  "inline-flex min-h-11 items-center gap-2 text-small text-ink-muted underline underline-offset-4 hover:text-ink";

/**
 * «Bewertung melden» in zwei Schritten (v2 10.1): Grund, dann optional eine
 * Beschreibung. Besucher gehen zur Anmeldung und kommen auf das Profil zurück.
 */
export function ReportReview({
  reviewId,
  signInHref,
}: {
  reviewId: string;
  signInHref: string | null;
}) {
  const t = useTranslations("reviews.report");
  const report = useReportDialog("message");
  const icon = <Flag aria-hidden strokeWidth={1.5} className="size-4" />;
  if (signInHref)
    return (
      <UiLink href={signInHref} className={quietLink}>
        {icon}
        {t("trigger")}
      </UiLink>
    );
  return (
    <ReportDialog
      trigger={
        <Button variant="quiet" icon={icon} data-report-review={reviewId}>
          {t("trigger")}
        </Button>
      }
      reasons={report.reasons}
      labels={{
        ...report.labels,
        title: t("title"),
        description: t("description"),
        sentText: t("sentText"),
      }}
      onSubmit={async (submission) => {
        const result = await reportReviewAction(reviewId, submission);
        if (!result.ok) throw new Error(result.reason);
      }}
    />
  );
}
