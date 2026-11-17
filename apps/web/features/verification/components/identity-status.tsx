import type { Locale } from "@app/core/locale";
import { InlineAlert } from "@app/ui";
import { Ban, CircleCheck, CircleDashed, CircleX, Clock } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { CheckOrigin } from "../actions/start-identity-check";
import { EXPIRY_WARNING_DAYS, failureReasonKey, type IdentityView } from "../identity-view";
import { StartCheckButton } from "./start-check-button";

const ICONS = {
  none: CircleDashed,
  pending: Clock,
  valid: CircleCheck,
  expired: CircleX,
  rejected: Ban,
} as const;

/**
 * Status der Identitätsprüfung in Icon und Wort (nie nur Farbe), mit der
 * passenden nächsten Aktion. Ohne angebundenen Dienstleister ein ehrlicher
 * Hinweis statt eines Buttons, der scheitert.
 */
export async function IdentityStatus({
  locale,
  view,
  providerConfigured,
  origin,
}: {
  locale: Locale;
  view: IdentityView;
  providerConfigured: boolean;
  origin: CheckOrigin;
}) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: "onboarding.identity" }), getFormatter({ locale })]);
  const date = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const Icon = ICONS[view.kind];
  const underAge = view.kind === "rejected" && view.reason === "under-age";

  const detail: Record<IdentityView["kind"], ReactNode> = {
    none: t("noneText"),
    pending: t("pendingText"),
    valid: view.kind === "valid" ? t("validText", { date: date(view.expiresAt) }) : null,
    expired: view.kind === "expired" && view.expiredAt ? t("expiredText", { date: date(view.expiredAt) }) : t("expiredTextNoDate"),
    rejected: view.kind === "rejected" ? t(`reasons.${failureReasonKey(view.reason)}`) : null,
  };
  const renewable = view.kind === "valid" && view.expiresInDays <= EXPIRY_WARNING_DAYS;
  const action = {
    none: t("start"),
    pending: t("restart"),
    valid: renewable ? t("retry") : null,
    expired: t("retry"),
    rejected: underAge ? null : t("retry"),
  }[view.kind];

  return (
    <div className="flex flex-col gap-4">
      <div data-identity-status={view.kind} className="flex flex-col gap-1 rounded-control border border-border p-4">
        <p className="text-label text-ink-muted">{t("statusLabel")}</p>
        <p className="flex items-center gap-2 text-body font-[550] text-ink">
          <Icon aria-hidden strokeWidth={1.5} className="size-5 shrink-0" />
          {t(view.kind)}
        </p>
        <p className="tabular text-small text-ink-muted">{detail[view.kind]}</p>
      </div>
      {action && !providerConfigured ? (
        <InlineAlert tone="info" title={t("unavailableTitle")}>
          {t("unavailableText")}
        </InlineAlert>
      ) : null}
      {action && providerConfigured ? <StartCheckButton origin={origin} label={action} variant={view.kind === "pending" ? "secondary" : "primary"} /> : null}
    </div>
  );
}
