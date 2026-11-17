import type { MediaStatus, MediaVisibility } from "@app/db";
import { Ban, CircleAlert, CircleCheck, Clock, Hourglass, Lock, PenLine, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const STATUS_ICON: Record<MediaStatus, ReactNode> = {
  UPLOADING: <Hourglass aria-hidden strokeWidth={1.5} />,
  PROCESSING: <Hourglass aria-hidden strokeWidth={1.5} />,
  IN_REVIEW: <Clock aria-hidden strokeWidth={1.5} />,
  PUBLISHED: <CircleCheck aria-hidden strokeWidth={1.5} />,
  CHANGES_REQUESTED: <PenLine aria-hidden strokeWidth={1.5} />,
  BLOCKED: <Ban aria-hidden strokeWidth={1.5} />,
  FAILED: <CircleAlert aria-hidden strokeWidth={1.5} />,
};

const STATUS_TONE: Partial<Record<MediaStatus, string>> = { PUBLISHED: "text-success", CHANGES_REQUESTED: "text-warning", BLOCKED: "text-error", FAILED: "text-error" };

/** Status als Wort mit Icon, nie nur als Farbe (PRD v2 11.3, Konventionen des Designsystems). */
export function MediaStatusLabel({ status }: { status: MediaStatus }) {
  const t = useTranslations("media.status");
  return (
    <span className={`inline-flex items-center gap-1 text-small [&_svg]:size-4 [&_svg]:shrink-0 ${STATUS_TONE[status] ?? "text-ink"}`} data-media-status={status}>
      {STATUS_ICON[status]}
      <span>{t(status)}</span>
    </span>
  );
}

export function MediaVisibilityLabel({ visibility }: { visibility: MediaVisibility }) {
  const t = useTranslations("media.visibility");
  return (
    <span className="inline-flex items-center gap-1 text-small text-ink-muted [&_svg]:size-4 [&_svg]:shrink-0" data-media-visibility={visibility}>
      {visibility === "MEMBERS" ? <Lock aria-hidden strokeWidth={1.5} /> : <Globe aria-hidden strokeWidth={1.5} />}
      <span>{t(visibility)}</span>
    </span>
  );
}
