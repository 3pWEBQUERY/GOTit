import { listBlocked } from "@app/core/messaging";
import { EmptyState } from "@app/ui";
import { ShieldCheck } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { UnblockButton } from "./unblock-button";

/**
 * «Blockiert» (v1 FR-CHAT-002, v2 7.5): wer dir nicht mehr schreiben kann,
 * die zuletzt blockierte Person zuoberst. Ohne Unterhaltung gibt es keinen
 * Griff zum Aufheben; dann steht der Eintrag ohne Aktion da.
 */
export async function BlockedList({ userId }: { userId: string }) {
  const [t, format, entries] = await Promise.all([getTranslations("settings.privacy.blocked"), getFormatter(), listBlocked(userId)]);
  if (entries.length === 0) {
    return <EmptyState icon={<ShieldCheck strokeWidth={1.5} />} title={t("emptyTitle")} description={t("emptyText")} className="py-4" />;
  }
  return (
    <ul aria-label={t("listLabel")} className="flex flex-col divide-y divide-border border-y border-border">
      {entries.map((entry, index) => {
        const name = entry.name ?? t("memberFallback");
        const date = format.dateTime(entry.blockedAt, { day: "2-digit", month: "2-digit", year: "numeric" });
        return (
          <li key={entry.conversationId ?? `ohne-${index}`} data-blocked-entry className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-body font-[550] break-words">{name}</p>
              <p className="text-small text-ink-muted">
                {t("blockedAt")} <time dateTime={entry.blockedAt.toISOString()}>{date}</time>
              </p>
            </div>
            {entry.conversationId ? <UnblockButton conversationId={entry.conversationId} name={name} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
