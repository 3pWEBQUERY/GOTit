import type { OrganizationLinkStatus } from "@app/db";
import { CircleCheck, CircleSlash, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

const ICON = {
  INVITED: Clock,
  ACTIVE: CircleCheck,
  DECLINED: CircleSlash,
  ENDED: CircleSlash,
} as const;

/** Status der Verknüpfung als Wort mit Icon (v2 12.2: Eingeladen, Aktiv, Gelöst), nie nur Farbe. */
export function LinkStatus({ status }: { status: OrganizationLinkStatus }) {
  const t = useTranslations("organization.linkStatus");
  const Icon = ICON[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-small [&_svg]:size-4 [&_svg]:shrink-0 ${status === "ACTIVE" ? "text-success" : "text-ink"}`}
      data-link-status={status}
    >
      <Icon aria-hidden strokeWidth={1.5} />
      <span>{t(status)}</span>
    </span>
  );
}
