import { listOwnSecurityEvents } from "@app/core/account";
import { EmptyState } from "@app/ui";
import { History } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RelativeTime } from "../components/relative-time";

/** Änderungsprotokoll: Ereignis, Gerät und Zeit; ohne IP-Adressen und Inhalte (PRD 7.5). */
export async function SecurityLog({ userId }: { userId: string }) {
  const [t, events] = await Promise.all([getTranslations("settings.security.log"), listOwnSecurityEvents(userId)]);
  if (events.length === 0) return <EmptyState icon={<History strokeWidth={1.5} />} title={t("emptyTitle")} description={t("emptyText")} className="py-4" />;
  const now = new Date();
  return (
    <ol aria-label={t("listLabel")} className="flex flex-col divide-y divide-border border-y border-border">
      {events.map((event) => (
        <li key={event.id} data-event={event.type} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
          <span className="text-body">
            {t(`events.${event.type}`)}
            {event.device ? <span className="text-small text-ink-muted"> · {event.device}</span> : null}
          </span>
          <span className="text-small text-ink-muted">
            <RelativeTime date={event.createdAt} now={now} />
          </span>
        </li>
      ))}
    </ol>
  );
}
