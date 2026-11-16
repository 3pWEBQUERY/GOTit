import { EmptyState } from "@app/ui";
import { MonitorSmartphone } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { getCurrentSession } from "../../account/queries/get-current-session";
import { getOwnSessions } from "../../account/queries/get-sessions";
import { RelativeTime } from "../components/relative-time";
import { RevokeSessionButton } from "./revoke-session-button";

/** Aktive Sitzungen mit Gerät und letzter Aktivität; die aktuelle ist markiert und steht zuoberst. */
export async function SessionsSection({ userId }: { userId: string }) {
  const [t, format, current] = await Promise.all([getTranslations("settings.security.sessions"), getFormatter(), getCurrentSession()]);
  const sessions = await getOwnSessions(userId, current?.session.id ?? null);
  const ordered = [...sessions].sort((a, b) => Number(b.current) - Number(a.current));
  const now = new Date();
  const others = ordered.filter((session) => !session.current);

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label={t("listLabel")} className="flex flex-col divide-y divide-border border-y border-border">
        {ordered.map((session) => (
          <li key={session.id} data-session={session.current ? "current" : "other"} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="flex flex-wrap items-center gap-2 text-body font-[550]">
                {session.device ?? t("unknownDevice")}
                {session.current ? <span className="rounded-chip bg-surface-2 px-2 text-label text-ink">{t("current")}</span> : null}
              </p>
              <p className="text-small text-ink-muted">
                {t("signedInAt", { date: format.dateTime(session.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" }) })}
                {" · "}
                {t("lastActive")} <RelativeTime date={session.lastActiveAt} now={now} />
              </p>
            </div>
            {session.current ? null : <RevokeSessionButton sessionId={session.id} />}
          </li>
        ))}
      </ul>
      {others.length === 0 ? <EmptyState icon={<MonitorSmartphone strokeWidth={1.5} />} title={t("emptyTitle")} description={t("emptyText")} className="py-4" /> : null}
    </div>
  );
}
