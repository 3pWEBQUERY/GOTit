import type { OrganizationKind } from "@app/db";
import { UiLink, buttonVariants, cn } from "@app/ui";
import { useTranslations } from "next-intl";
import {
  KIND_PARAM,
  REGION_PARAM,
  clubsQuery,
  type ClubFilters,
} from "../lib/filters";
import { linkClass } from "./club-locations";

const chipClass =
  "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-small font-[550] whitespace-nowrap transition-colors duration-state";

/**
 * Filter von `/clubs`: Art als Links (sie wechseln die Seite), Region als
 * Auswahl in einem GET-Formular. Beides steht in der URL (v2 8.2) und
 * funktioniert ohne JavaScript.
 */
export function ClubsFilters({
  base,
  filters,
  regions,
}: {
  base: string;
  filters: ClubFilters;
  regions: readonly { slug: string; name: string; kind: "CANTON" | "CITY" }[];
}) {
  const t = useTranslations("clubs.list");
  const link = (next: ClubFilters) => {
    const query = clubsQuery(next);
    return query ? `${base}?${query}` : base;
  };
  const kindValue = new URLSearchParams(
    clubsQuery({ kind: filters.kind, region: null }),
  ).get(KIND_PARAM);
  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label={t("kindLabel")}
        className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        <ul className="flex flex-nowrap gap-2 p-1">
          {([null, "CLUB", "AGENCY"] as const).map(
            (kind: OrganizationKind | null) => {
              const active = filters.kind === kind;
              return (
                <li key={kind ?? "alle"}>
                  <UiLink
                    href={link({ ...filters, kind })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      chipClass,
                      active
                        ? "border-accent bg-accent text-on-accent"
                        : "border-border-strong bg-surface text-ink hover:bg-surface-2",
                    )}
                  >
                    {kind ? t(`kinds.${kind}`) : t("kinds.all")}
                  </UiLink>
                </li>
              );
            },
          )}
        </ul>
      </nav>
      <form
        method="get"
        action={base}
        className="flex flex-wrap items-end gap-3"
      >
        {kindValue ? (
          <input type="hidden" name={KIND_PARAM} value={kindValue} />
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <label
            htmlFor="clubs-region"
            className="text-small font-[550] text-ink"
          >
            {t("region")}
          </label>
          <select
            id="clubs-region"
            name={REGION_PARAM}
            defaultValue={filters.region ?? ""}
            className="min-h-11 max-w-full rounded-control border border-border-strong bg-surface px-3 text-body text-ink"
          >
            <option value="">{t("allRegions")}</option>
            {regions.map((region) => (
              <option key={region.slug} value={region.slug}>
                {region.kind === "CANTON"
                  ? t("canton", { name: region.name })
                  : region.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary" })}
        >
          {t("apply")}
        </button>
        {filters.kind || filters.region ? (
          <UiLink href={base} className={linkClass}>
            {t("reset")}
          </UiLink>
        ) : null}
      </form>
    </div>
  );
}
