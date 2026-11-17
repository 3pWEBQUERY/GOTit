"use client";

import { UiLink, cn } from "@app/ui";
import { ShieldMinus } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@app/core/locale";

/** Ende einer Einschränkung als ISO-Text; null ohne Ende. */
export interface RestrictionInfo {
  until: string | null;
}

/**
 * Ruhiger Hinweis, wenn die Moderation das Konto eingeschränkt hat (v1 9.2):
 * was nicht geht, bis wann, und der Weg zu Grund und Einspruch in den
 * Einstellungen. Steht anstelle der gesperrten Aktion oder an ihrem Fehler.
 */
export function RestrictionNotice({ kind, restriction, className }: { kind: "MESSAGING" | "BOOKING"; restriction: RestrictionInfo; className?: string }) {
  const t = useTranslations("moderation.member.restricted");
  const format = useFormatter();
  const locale = useLocale() as Locale;
  const date = restriction.until ? format.dateTime(new Date(restriction.until), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" }) : null;
  const href = `${getPathname({ href: "/einstellungen/daten", locale })}#einschraenkungen`;
  return (
    <div role="status" data-restriction-notice={kind} className={cn("flex items-start gap-3 rounded-card border border-border bg-surface-2 p-4", className)}>
      <ShieldMinus aria-hidden strokeWidth={1.5} className="mt-0.5 size-5 shrink-0 text-ink-muted" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body text-ink">{date ? t(kind, { date }) : t(`${kind}NoEnd`)}</p>
        <UiLink href={href} className="inline-flex min-h-11 items-center self-start text-small text-ink underline underline-offset-4">
          {t("link")}
        </UiLink>
      </div>
    </div>
  );
}
