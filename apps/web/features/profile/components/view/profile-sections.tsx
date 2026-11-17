import type { ProfileSection } from "@app/core/provider-profile/schemas";
import { RateTable, ServiceList } from "@app/ui";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { formatChf, formatDuration } from "../../../onboarding/format";
import type { ProfileViewModel } from "../../model";
import { EditLink } from "./edit-link";
import { Heading, type HeadingLevel } from "./heading";

export type EditLinks = Partial<Record<ProfileSection, string>>;

function Section({ id, level, title, editHref, editLabel, children }: { id: string; level: HeadingLevel; title: string; editHref?: string; editLabel: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <Heading level={level} id={id} className={level <= 2 ? "text-h2" : "text-h3"}>
          {title}
        </Heading>
        {editHref ? <EditLink href={editHref}>{editLabel}</EditLink> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Übersicht: Über mich, Angebot, Preise (PRD v2 10). Verfügbarkeit (1.9),
 * Bewertungen (1.10) und Verknüpfungen (1.11) erscheinen erst mit ihren
 * Modulen; bis dahin gibt es keine leeren Hüllen. Ohne Leistungen entfällt
 * «Angebot».
 */
export function ProfileSections({ model, level, idPrefix, editLinks }: { model: ProfileViewModel; level: HeadingLevel; idPrefix: string; editLinks?: EditLinks }) {
  const t = useTranslations("profile.sections");
  const locale = useLocale();
  const format = useFormatter();
  const updated = model.ratesUpdatedAt ? format.dateTime(new Date(model.ratesUpdatedAt), { day: "2-digit", month: "2-digit", year: "numeric" }) : null;

  return (
    <div className="flex flex-col gap-8">
      <Section id={`${idPrefix}-ueber`} level={level} title={t("about")} editHref={editLinks?.description} editLabel={t("editAbout")}>
        <p className="max-w-prose text-body whitespace-pre-line text-ink">{model.description || t("noDescription")}</p>
      </Section>
      {model.services.length > 0 ? (
        <Section id={`${idPrefix}-angebot`} level={level} title={t("offer")} editHref={editLinks?.offer} editLabel={t("editOffer")}>
          <ServiceList groups={[{ key: "alle", items: model.services.map((service) => ({ key: service.key, label: service.name })) }]} />
        </Section>
      ) : null}
      <Section id={`${idPrefix}-preise`} level={level} title={t("rates")} editHref={editLinks?.rates} editLabel={t("editRates")}>
        <RateTable
          caption={t("rates")}
          hideCaption
          columns={{ duration: t("columns.duration"), price: t("columns.price"), note: t("columns.note") }}
          rows={model.rates.map((rate) => ({
            key: rate.key,
            duration: formatDuration(locale, rate.durationMinutes),
            price: formatChf(locale, rate.priceChf),
            note: rate.note ?? undefined,
          }))}
          emptyText={t("onRequest")}
          updatedText={updated ? t("ratesUpdated", { date: updated }) : undefined}
        />
      </Section>
    </div>
  );
}
