import type { Locale } from "@app/core/locale";
import { getFormatter, getTranslations } from "next-intl/server";
import { SettingsBlock } from "../settings/components/settings-block";
import { AppealForm } from "./appeal-form";
import { RESTRICTIONS_ANCHOR, ownRestrictions } from "./queries";

/**
 * «Einschränkungen» unter «Daten und Konto» (v1 9.2): Art, Regel in Worten,
 * Begründung und Ende jeder aktiven Einschränkung, dazu der Einspruch. Ohne
 * aktive Einschränkung erscheint der Abschnitt nicht (Entscheid 0021).
 */
export async function OwnRestrictions({ locale, userId }: { locale: Locale; userId: string }) {
  const restrictions = await ownRestrictions(userId);
  if (restrictions.length === 0) return null;
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: "moderation" }), getFormatter({ locale })]);
  const day = (value: Date) => format.dateTime(value, { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <SettingsBlock id={RESTRICTIONS_ANCHOR} title={t("member.settings.title")} intro={t("member.settings.intro")}>
      <ul aria-label={t("member.settings.listLabel")} className="flex flex-col divide-y divide-border border-y border-border">
        {restrictions.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-4 py-4" data-own-restriction={entry.kind}>
            <h3 className="text-h3">{t(`restrictionKind.${entry.kind}`)}</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-muted">{t("member.settings.rule")}</dt>
                <dd className="text-body">{t.has(`rules.${entry.rule}`) ? t(`rules.${entry.rule}`) : entry.rule}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-muted">{t("member.settings.until")}</dt>
                <dd className="tabular text-body">{entry.until ? day(entry.until) : t("member.settings.noEnd")}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-muted">{t("member.settings.since")}</dt>
                <dd className="tabular text-body">{day(entry.createdAt)}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-label text-ink-muted">{t("member.settings.reason")}</dt>
                <dd className="text-body break-words whitespace-pre-wrap">{entry.reason}</dd>
              </div>
            </dl>
            {entry.appealStatus === "NONE" ? (
              <div className="flex flex-col gap-2">
                <h4 className="text-label">{t("member.appeal.title")}</h4>
                <AppealForm target={{ kind: "restriction", id: entry.id }} />
              </div>
            ) : (
              <p role="status" className="text-small text-ink" data-own-appeal={entry.appealStatus}>
                {t(`member.settings.appealStatus.${entry.appealStatus}`)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </SettingsBlock>
  );
}
