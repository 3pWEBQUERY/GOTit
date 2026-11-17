import type { Locale } from "@app/core/locale";
import { EmptyState, UiLink } from "@app/ui";
import { ArrowLeft, UsersRound } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { windowsToValue } from "../../booking/studio/lib/windows";
import { createHref } from "../../shell/nav/href";
import { minuteLabel } from "../lib/exceptions";
import { requireLocation } from "../queries/locations";
import { DeleteLocation } from "./delete-location";
import { ExceptionsSection } from "./exceptions-section";
import { HoursForm } from "./hours-form";
import { LinkStatus } from "./link-status";
import { LocationForm } from "./location-form";
import { PageHeading } from "./page-heading";
import { PermissionNote } from "./permission-note";

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-3 border-t border-border pt-5"
    >
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      {hint ? (
        <p className="max-w-reading text-small text-ink-muted">{hint}</p>
      ) : null}
      {children}
    </section>
  );
}

/** `/studio/o/[org]/standorte/[id]` (v2 12.2): Angaben, Öffnungszeiten, Ausnahmen, zugeordnete Anbieter, Löschen. */
export async function LocationDetailPage({
  locale,
  slug,
  id,
}: {
  locale: Locale;
  slug: string;
  id: string;
}) {
  const [{ context, location, regions, providers }, t, format] =
    await Promise.all([
      requireLocation(slug, id, locale),
      getTranslations({ locale, namespace: "organization.locations" }),
      getFormatter({ locale }),
    ]);
  const href = createHref(locale);
  const listHref = href({
    pathname: "/studio/o/[org]/standorte",
    params: { org: slug },
  });
  const canEdit = context.can("locations.edit");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
  }).format(new Date());
  const exceptions = location.exceptions.map((entry) => ({
    id: entry.id,
    dayLabel: format.dateTime(new Date(`${entry.day}T12:00:00Z`), {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }),
    hoursLabel:
      entry.closed || entry.startMinute === null || entry.endMinute === null
        ? t("closedAllDay")
        : `${minuteLabel(entry.startMinute)}–${minuteLabel(entry.endMinute)}`,
    note: entry.note,
  }));
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <UiLink
        href={listHref}
        className="inline-flex min-h-11 items-center gap-2 self-start text-body text-ink underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden strokeWidth={1.5} className="size-5" />
        {t("back")}
      </UiLink>
      <PageHeading title={location.name} intro={t("detailIntro")} />
      {canEdit ? null : <PermissionNote text={t("noPermission")} />}
      <Section id="standort-angaben" title={t("detailsTitle")}>
        <LocationForm
          slug={slug}
          locationId={location.id}
          regions={regions}
          canEdit={canEdit}
          initial={{
            name: location.name,
            description: location.description ?? "",
            regionId: location.regionId,
            areaLabel: location.areaLabel ?? "",
            phone: location.phone ?? "",
            website: location.website ?? "",
          }}
        />
      </Section>
      <Section
        id="standort-zeiten"
        title={t("hoursTitle")}
        hint={t("hoursHint")}
      >
        <HoursForm
          slug={slug}
          locationId={location.id}
          initial={windowsToValue(location.hours)}
          canEdit={canEdit}
        />
      </Section>
      <Section
        id="standort-ausnahmen"
        title={t("exceptionsTitle")}
        hint={t("exceptionsHint")}
      >
        <ExceptionsSection
          slug={slug}
          locationId={location.id}
          exceptions={exceptions}
          canEdit={canEdit}
          today={today}
        />
      </Section>
      <Section
        id="standort-anbieter"
        title={t("providersTitle")}
        hint={t("providersHint")}
      >
        {providers.length === 0 ? (
          <EmptyState
            icon={<UsersRound strokeWidth={1.5} />}
            title={t("providersEmpty")}
            className="py-2"
          />
        ) : (
          <ul
            aria-label={t("providersTitle")}
            className="flex flex-col divide-y divide-border border-y border-border"
            data-location-providers
          >
            {providers.map((row) => (
              <li
                key={row.linkId}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <UiLink
                  href={href({
                    pathname: "/p/[name]",
                    params: { name: row.slug },
                  })}
                  className="min-w-0 text-body font-[550] break-words text-ink underline-offset-4 hover:underline"
                >
                  {row.displayName}
                </UiLink>
                <LinkStatus status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
      {canEdit ? (
        <Section
          id="standort-loeschen"
          title={t("deleteSection")}
          hint={t("deleteHint")}
        >
          <DeleteLocation
            slug={slug}
            locationId={location.id}
            name={location.name}
            listHref={listHref}
          />
        </Section>
      ) : null}
    </div>
  );
}
