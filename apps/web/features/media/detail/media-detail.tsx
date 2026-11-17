import type { Locale } from "@app/core/locale";
import { InlineAlert, UiLink } from "@app/ui";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { MediaStatusLabel, MediaVisibilityLabel } from "../library/media-status";
import { PROFILE_SCOPE, WITH_VARIANTS, type LibraryItem, type MediaScope } from "../library/types";
import { AltTextForm } from "./alt-text-form";
import { CoverControl } from "./cover-control";
import { DeleteSection } from "./delete-section";
import { MediaPreview } from "./media-preview";
import { VisibilitySwitch } from "./visibility-switch";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t border-border pt-4">
      <h2 id={id} className="text-h3">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Detail eines Mediums (PRD v2 7.6, 11.3): Vorschau, Hinweis der Moderation,
 * Alternativtext, Sichtbarkeit, Titelbild, Löschen. Für eine Organisation
 * Logo statt Sichtbarkeit (Entscheid 0018).
 */
export async function MediaDetail({ locale, item, scope = PROFILE_SCOPE }: { locale: Locale; item: LibraryItem; scope?: MediaScope }) {
  const t = await getTranslations({ locale, namespace: "media.detail" });
  const href = createHref(locale);
  const organization = scope.kind === "organization";
  const libraryHref = scope.kind === "organization" ? href({ pathname: "/studio/o/[org]/medien", params: { org: scope.org } }) : href("/studio/medien");
  const eligible = WITH_VARIANTS.includes(item.status);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <UiLink href={libraryHref} className="inline-flex min-h-11 items-center gap-2 self-start text-body text-ink underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden strokeWidth={1.5} className="size-5" />
        {t("back")}
      </UiLink>
      <h1 className="text-h1">{t("title")}</h1>
      <div className="grid min-w-0 gap-8 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <MediaPreview item={item} alt={item.altText ?? t("neutralAlt")} pendingLabel={t("notReady")} />
          <dl className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex flex-col gap-1">
              <dt className="text-label text-ink-muted">{t("status")}</dt>
              <dd>
                <MediaStatusLabel status={item.status} />
              </dd>
            </div>
            {organization ? null : (
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-muted">{t("visibility")}</dt>
                <dd>
                  <MediaVisibilityLabel visibility={item.visibility} />
                </dd>
              </div>
            )}
            {item.width && item.height ? (
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-muted">{t("size")}</dt>
                <dd className="tabular text-small text-ink">{t("dimensions", { width: item.width, height: item.height })}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          {item.status === "CHANGES_REQUESTED" || item.status === "BLOCKED" ? (
            <InlineAlert tone={item.status === "BLOCKED" ? "error" : "warning"} title={t(item.status === "BLOCKED" ? "moderationBlocked" : "moderationChanges")}>
              <p className="break-words whitespace-pre-line" data-moderation-note>
                {item.moderationNote}
              </p>
              <p className="mt-2">{t("moderationHelp")}</p>
            </InlineAlert>
          ) : null}
          <AltTextForm mediaId={item.id} initial={item.altText ?? ""} scope={scope} />
          {organization ? (
            <Section id="medium-logo" title={t("logoTitle")}>
              <p className="text-small text-ink-muted">{t("logoHint")}</p>
              <CoverControl mediaId={item.id} isCover={item.isLogo} eligible={eligible} scope={scope} kind="logo" />
            </Section>
          ) : (
            <Section id="medium-sichtbarkeit" title={t("visibility")}>
              <VisibilitySwitch mediaId={item.id} membersOnly={item.visibility === "MEMBERS"} />
            </Section>
          )}
          <Section id="medium-titelbild" title={t("coverTitle")}>
            <p className="text-small text-ink-muted">{organization ? t("coverHintOrganization") : t("coverHint")}</p>
            <CoverControl mediaId={item.id} isCover={item.isCover} eligible={eligible} scope={scope} />
          </Section>
          <Section id="medium-loeschen" title={t("deleteTitle")}>
            <p className="text-small text-ink-muted">{t("deleteHint")}</p>
            <DeleteSection mediaId={item.id} libraryHref={libraryHref} scope={scope} />
          </Section>
        </div>
      </div>
    </div>
  );
}
