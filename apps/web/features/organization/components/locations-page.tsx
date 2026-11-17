import type { Locale } from "@app/core/locale";
import { EmptyState, UiLink } from "@app/ui";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { loadLocations } from "../queries/locations";
import { LocationCreate } from "./location-create";
import { PageHeading } from "./page-heading";
import { PermissionNote } from "./permission-note";

/** `/studio/o/[org]/standorte` (v2 12.2): Liste der Standorte mit Region, Öffnungstagen und Anbietern. */
export async function LocationsPage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const [{ context, locations, regions, providers }, t] = await Promise.all([
    loadLocations(slug, locale),
    getTranslations({ locale, namespace: "organization.locations" }),
  ]);
  const href = createHref(locale);
  const detail = (id: string) =>
    href({
      pathname: "/studio/o/[org]/standorte/[id]",
      params: { org: slug, id },
    });
  const canEdit = context.can("locations.edit");
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeading
        title={t("title")}
        intro={t("intro")}
        action={
          canEdit ? (
            <LocationCreate
              slug={slug}
              regions={regions}
              detailHref={detail("__id__")}
            />
          ) : undefined
        }
      />
      {canEdit ? null : <PermissionNote text={t("noPermission")} />}
      {locations.length === 0 ? (
        <EmptyState
          icon={<MapPin strokeWidth={1.5} />}
          title={t("emptyTitle")}
          description={canEdit ? t("emptyDescription") : t("emptyReadOnly")}
        />
      ) : (
        <ul
          aria-label={t("listLabel")}
          className="flex flex-col divide-y divide-border border-y border-border"
          data-location-list
        >
          {locations.map((location) => {
            const days = new Set(location.hours.map((entry) => entry.weekday))
              .size;
            const linked = providers.filter(
              (row) => row.locationId === location.id,
            ).length;
            return (
              <li
                key={location.id}
                className="flex flex-col gap-1 py-3"
                data-location-row={location.id}
              >
                <UiLink
                  href={detail(location.id)}
                  className="self-start text-body font-[550] break-words text-ink underline-offset-4 hover:underline"
                >
                  {location.name}
                </UiLink>
                <p className="text-small break-words text-ink-muted">
                  {[location.regionName, location.areaLabel]
                    .filter(Boolean)
                    .join(" · ") || t("noPlace")}
                </p>
                <p className="text-small text-ink-muted">
                  {days > 0 ? t("openDays", { count: days }) : t("noHours")}
                  <span aria-hidden> · </span>
                  <span className="sr-only">, </span>
                  {t("providerCount", { count: linked })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
