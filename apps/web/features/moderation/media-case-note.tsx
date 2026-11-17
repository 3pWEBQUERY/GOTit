import type { Locale } from "@app/core/locale";
import type { AppealableCase } from "@app/core/moderation";
import { getFormatter, getTranslations } from "next-intl/server";
import { formatCaseId } from "../admin/moderation/case-id";
import { AppealForm } from "./appeal-form";

/**
 * Entscheid der Moderation zu einem eigenen Medium (v2 12.4): Fall, Regel
 * und Begründung, dazu einmal «Einspruch erheben». Eine zweite Person
 * prüft ihn; stattgegeben wird das Medium wieder sichtbar.
 */
export async function MediaCaseNote({ locale, mediaId, found }: { locale: Locale; mediaId: string; found: AppealableCase }) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: "moderation" }), getFormatter({ locale })]);
  const rule = found.rule ? (t.has(`rules.${found.rule}`) ? t(`rules.${found.rule}`) : found.rule) : "–";
  const decided = found.decidedAt ? format.dateTime(found.decidedAt, { day: "2-digit", month: "2-digit", year: "numeric" }) : "–";
  return (
    <section aria-labelledby="medium-moderation" className="flex flex-col gap-3 border-t border-border pt-4" data-media-case={found.appealStatus}>
      <h2 id="medium-moderation" className="text-h3">
        {t("member.media.title")}
      </h2>
      <p className="text-small text-ink-muted">{t("member.media.caseLine", { id: formatCaseId(found.number, found.createdAt), rule, date: decided })}</p>
      {found.decisionReason ? <p className="text-body break-words whitespace-pre-wrap">{found.decisionReason}</p> : null}
      {found.canAppeal ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-label">{t("member.appeal.title")}</h3>
          <AppealForm target={{ kind: "media", id: mediaId }} label={t("member.media.reason")} />
        </div>
      ) : (
        <p role="status" className="text-small text-ink">
          {t(`member.media.appealStatus.${found.appealStatus === "NONE" ? "OPEN" : found.appealStatus}`)}
        </p>
      )}
    </section>
  );
}
