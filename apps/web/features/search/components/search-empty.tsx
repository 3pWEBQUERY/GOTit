import type { Locale } from "@app/core/locale";
import type { SearchResult } from "@app/core/search";
import { withoutFilter, type SearchQuery } from "@app/core/search/query";
import { EmptyState, buttonVariants } from "@app/ui";
import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createHref } from "../../shell/nav/href";
import type { FilterLabel } from "../filter-labels";
import { hasOwnFilters, resetQuery, searchUrl, type SearchPaths } from "../url";

export interface SearchEmptyProps {
  locale: Locale;
  query: SearchQuery;
  paths: SearchPaths;
  chips: readonly FilterLabel[];
  mostRestrictive: SearchResult["mostRestrictive"];
}

/**
 * Keine Treffer (PRD v2 9.2): nennt den Filter, der am stärksten einschränkt,
 * und bietet an, genau ihn zu entfernen. Sonst: zurücksetzen oder andere Regionen.
 */
export async function SearchEmpty({
  locale,
  query,
  paths,
  chips,
  mostRestrictive,
}: SearchEmptyProps) {
  const t = await getTranslations({ locale, namespace: "search.empty" });
  const restrictive = mostRestrictive
    ? chips.find((chip) => chip.key === mostRestrictive.key)
    : undefined;
  const link = (url: string, label: string) => (
    <Link
      href={url}
      scroll={false}
      className={buttonVariants({ variant: "secondary" })}
    >
      {label}
    </Link>
  );

  if (mostRestrictive && restrictive)
    return (
      <EmptyState
        icon={<SearchX strokeWidth={1.5} />}
        title={t("title")}
        description={t("restrictive", {
          label: restrictive.label,
          count: mostRestrictive.total,
        })}
        action={link(
          searchUrl(paths, withoutFilter(query, mostRestrictive.key)),
          t("remove", { label: restrictive.label }),
        )}
      />
    );
  if (hasOwnFilters(query, paths.preset))
    return (
      <EmptyState
        icon={<SearchX strokeWidth={1.5} />}
        title={t("title")}
        description={t("description")}
        action={link(
          searchUrl(paths, resetQuery(query, paths.preset)),
          t("reset"),
        )}
      />
    );
  return (
    <EmptyState
      icon={<SearchX strokeWidth={1.5} />}
      title={t("noFilterTitle")}
      description={t("noFilterDescription")}
      action={link(createHref(locale)("/ch"), t("noFilterAction"))}
    />
  );
}
