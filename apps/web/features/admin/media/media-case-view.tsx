import type { Locale } from "@app/core/locale";
import { mediaUrl } from "@app/core/media/variants";
import { InlineAlert } from "@app/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../shell/nav/href";
import { AdminPageHeader } from "../components/page-header";
import { caseAge } from "../queue/case-age";
import { MediaDecisionForm } from "./media-decision-form";
import { MediaReveal } from "./media-reveal";
import type { MediaCase } from "./queries";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body break-words text-ink">{children}</dd>
    </div>
  );
}

/** Einzelfall eines Mediums (PRD v2 12.4): verdeckte Vorschau, Angaben, Entscheid mit Begründung. */
export async function MediaCaseView({ locale, media, alreadyDecided, now }: { locale: Locale; media: MediaCase; alreadyDecided: boolean; now: Date }) {
  const [t, tAdmin, format] = await Promise.all([getTranslations({ locale, namespace: "admin.media" }), getTranslations({ locale, namespace: "admin" }), getFormatter({ locale })]);
  const href = createHref(locale);
  const name = media.providerProfile?.displayName ?? media.organization?.name ?? t("noProfile");
  const age = caseAge(media.updatedAt, now);
  const submitted = format.dateTime(media.updatedAt, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const ageLabel = age.unit === "lessThanHour" ? tAdmin("queue.age.lessThanHour") : tAdmin(`queue.age.${age.unit}`, { count: age.count });
  const open = media.status === "IN_REVIEW";
  // Die Vorschau geht über die eigene, geprüfte Route; sie liefert nur Medien in Prüfung.
  const previewSrc = mediaUrl(media.id, 960, "webp").replace("/media/", "/media/review/");

  return (
    <>
      <AdminPageHeader
        title={t("caseTitle", { name })}
        crumbsLabel={tAdmin("shell.breadcrumbs")}
        crumbs={[{ label: tAdmin("shell.overview"), href: href("/admin") }, { label: tAdmin("shell.media"), href: href("/admin/medien") }, { label: name }]}
      />
      <p className="text-small text-ink-muted">{t("meta", { submitted, age: ageLabel, state: t(`status.${media.status}`) })}</p>
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,22rem)]">
        {open ? (
          <MediaReveal src={previewSrc} alt={media.altText ?? t("preview.neutralAlt")} ratio={media.width && media.height ? `${media.width} / ${media.height}` : "4 / 5"} placeholderColor={media.dominantColor} />
        ) : (
          <InlineAlert title={t("preview.unavailable")} />
        )}
        <section aria-labelledby="medium-angaben" className="flex min-w-0 flex-col gap-2">
          <h2 id="medium-angaben" className="text-h3">
            {t("facts.title")}
          </h2>
          <dl>
            <Fact label={media.organization ? t("facts.organization") : t("facts.profile")}>{name}</Fact>
            <Fact label={t("facts.visibility")}>{t(`visibility.${media.visibility}`)}</Fact>
            <Fact label={t("facts.altText")}>{media.altText ?? t("facts.none")}</Fact>
            <Fact label={t("facts.size")}>{media.width && media.height ? t("facts.dimensions", { width: media.width, height: media.height }) : t("facts.none")}</Fact>
          </dl>
        </section>
        <section aria-labelledby="medium-entscheid-titel" className="flex min-w-0 flex-col gap-4 lg:col-span-2 xl:col-span-1">
          <h2 id="medium-entscheid-titel" className="text-h3">
            {t("decision.title")}
          </h2>
          {alreadyDecided ? <InlineAlert tone="warning" title={tAdmin("errors.mediaAlreadyDecided")}>{tAdmin("decision.alreadyDecidedHelp")}</InlineAlert> : null}
          {open ? (
            <>
              <div className="hidden lg:block">
                <MediaDecisionForm mediaId={media.id} queueHref={href("/admin/medien")} />
              </div>
              <div className="lg:hidden">
                <InlineAlert title={tAdmin("decision.readOnlyTitle")}>{tAdmin("decision.readOnlyDescription")}</InlineAlert>
              </div>
            </>
          ) : (
            <dl data-media-decision-readonly>
              <Fact label={t("decision.result")}>{t(`status.${media.status}`)}</Fact>
              {media.moderationNote ? <Fact label={t("decision.note")}>{media.moderationNote}</Fact> : null}
            </dl>
          )}
        </section>
      </div>
    </>
  );
}
