import type { Viewer } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { pauseAvailability } from "@app/core/provider-profile";
import { getTranslations } from "next-intl/server";
import { ProfileStatus } from "./profile-status";

/** Profilstatus des angemeldeten Anbieters mit übersetzten Texten. */
export async function ProfileStatusForViewer({ locale, viewer }: { locale: Locale; viewer: Viewer }) {
  if (viewer.kind !== "account" || !viewer.provider) return null;
  const t = await getTranslations({ locale, namespace: "studio" });
  return (
    <ProfileStatus
      key={viewer.provider.status}
      initialStatus={viewer.provider.status}
      initialAvailability={pauseAvailability(viewer.provider.status)}
      labels={{
        prefix: t("status.prefix"),
        status: {
          DRAFT: t("status.DRAFT"),
          SUBMITTED: t("status.SUBMITTED"),
          CHANGES_REQUESTED: t("status.CHANGES_REQUESTED"),
          PUBLISHED: t("status.PUBLISHED"),
          PAUSED: t("status.PAUSED"),
          RESTRICTED: t("status.RESTRICTED"),
          SUSPENDED: t("status.SUSPENDED"),
          ARCHIVED: t("status.ARCHIVED"),
        },
        pause: t("pause.pause"),
        resume: t("pause.resume"),
        paused: t("pause.paused"),
        resumed: t("pause.resumed"),
        undo: t("pause.undo"),
        failed: t("pause.failed"),
        blocked: { "not-published": t("pause.blockedNotPublished"), suspended: t("pause.blockedSuspended"), restricted: t("pause.blockedRestricted") },
      }}
    />
  );
}
