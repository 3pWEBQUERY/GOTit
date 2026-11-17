"use client";

import {
  PRICE_LIMIT,
  SEARCH_RADII,
  type SearchQuery,
  type SearchRadius,
} from "@app/core/search/query";
import {
  Checkbox,
  CheckboxGroup,
  FilterGroup,
  RadioGroup,
  Select,
  TextField,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useState, type KeyboardEvent } from "react";
import { withFilters } from "../url";
import type { FilterOptions } from "../queries/filter-options";

/** Wert der Auswahl «Ganze Schweiz»; Radix erlaubt keinen leeren Wert. */
const ALL_REGIONS = "*";
const NO_RADIUS = "0";
/** Die Landessprachen und Englisch stehen immer sichtbar, die übrigen hinter «Weitere Sprachen». */
const MAIN_LANGUAGES = 4;

export interface SearchFilterFieldsProps {
  value: SearchQuery;
  onChange: (next: SearchQuery) => void;
  options: FilterOptions;
}

function toggle(list: readonly string[], item: string, on: boolean): string[] {
  return on
    ? [...new Set([...list, item])].sort()
    : list.filter((entry) => entry !== item);
}

/**
 * Die Filter aus Entscheid 0013, gemeinsam für die Seitenleiste (wirkt sofort)
 * und das Sheet (wirkt beim Anwenden). Innerhalb einer Gruppe gilt «oder».
 */
export function SearchFilterFields({
  value,
  onChange,
  options,
}: SearchFilterFieldsProps) {
  const t = useTranslations("search.filters");
  const change = (patch: Partial<SearchQuery>) =>
    onChange(withFilters(value, patch));
  const names = (
    codes: readonly string[],
    from: readonly { code?: string; slug?: string; name: string }[],
  ) =>
    codes
      .map(
        (code) =>
          from.find((entry) => (entry.code ?? entry.slug) === code)?.name ??
          code,
      )
      .join(", ");
  const moreSelected = options.languages
    .slice(MAIN_LANGUAGES)
    .some((language) => value.languages.includes(language.code));
  const languageBox = (language: { code: string; name: string }) => (
    <Checkbox
      key={language.code}
      label={language.name}
      checked={value.languages.includes(language.code)}
      onCheckedChange={(checked) =>
        change({
          languages: toggle(value.languages, language.code, checked === true),
        })
      }
    />
  );
  const contentSummary = [
    value.photos ? t("photos") : null,
    value.newOnly ? t("newOnly") : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <LocationGroup value={value} change={change} options={options} />
      <FilterGroup
        title={t("profile")}
        summary={
          value.languages.length > 0
            ? names(value.languages, options.languages)
            : undefined
        }
      >
        <CheckboxGroup label={t("languages")}>
          {options.languages.slice(0, MAIN_LANGUAGES).map(languageBox)}
          <details open={moreSelected || undefined} className="group">
            <summary className="flex min-h-11 cursor-pointer items-center text-small font-[550] text-ink underline underline-offset-4">
              {t("moreLanguages", {
                count: options.languages.length - MAIN_LANGUAGES,
              })}
            </summary>
            <div className="flex flex-col">
              {options.languages.slice(MAIN_LANGUAGES).map(languageBox)}
            </div>
          </details>
        </CheckboxGroup>
      </FilterGroup>
      <FilterGroup
        title={t("offer")}
        summary={
          value.categories.length > 0
            ? names(value.categories, options.categories)
            : undefined
        }
      >
        {options.categories.length > 0 ? (
          <CheckboxGroup label={t("categories")}>
            {options.categories.map((category) => (
              <Checkbox
                key={category.slug}
                label={category.name}
                checked={value.categories.includes(category.slug)}
                onCheckedChange={(checked) =>
                  change({
                    categories: toggle(
                      value.categories,
                      category.slug,
                      checked === true,
                    ),
                  })
                }
              />
            ))}
          </CheckboxGroup>
        ) : null}
        <PriceFields
          min={value.priceMin}
          max={value.priceMax}
          onCommit={(priceMin, priceMax) => change({ priceMin, priceMax })}
        />
      </FilterGroup>
      <FilterGroup title={t("content")} summary={contentSummary || undefined}>
        <div className="flex flex-col">
          <Checkbox
            label={t("photos")}
            description={t("photosHint")}
            checked={value.photos}
            onCheckedChange={(checked) => change({ photos: checked === true })}
          />
          <Checkbox
            label={t("newOnly")}
            description={t("newOnlyHint")}
            checked={value.newOnly}
            onCheckedChange={(checked) => change({ newOnly: checked === true })}
          />
        </div>
      </FilterGroup>
    </>
  );
}

/** Standort: Region und, sobald eine gewählt ist, der Umkreis um ihren Mittelpunkt. */
function LocationGroup({
  value,
  change,
  options,
}: {
  value: SearchQuery;
  change: (patch: Partial<SearchQuery>) => void;
  options: FilterOptions;
}) {
  const t = useTranslations("search.filters");
  const region = options.regions.find((entry) => entry.slug === value.region);
  return (
    <FilterGroup
      title={t("location")}
      summary={
        region
          ? [
              region.label,
              value.radiusKm ? t("radiusKm", { km: value.radiusKm }) : null,
            ]
              .filter(Boolean)
              .join(", ")
          : undefined
      }
    >
      <Select
        label={t("region")}
        options={[
          { value: ALL_REGIONS, label: t("allRegions") },
          ...options.regions.map((entry) => ({
            value: entry.slug,
            label: entry.label,
          })),
        ]}
        value={value.region ?? ALL_REGIONS}
        onValueChange={(next) =>
          change({
            region: next === ALL_REGIONS ? null : next,
            radiusKm: null,
          })
        }
      />
      {value.region ? (
        <RadioGroup
          label={t("radius")}
          hint={t("radiusHint")}
          options={[
            { value: NO_RADIUS, label: t("radiusNone") },
            ...SEARCH_RADII.map((km) => ({
              value: String(km),
              label: t("radiusKm", { km }),
            })),
          ]}
          value={String(value.radiusKm ?? NO_RADIUS)}
          onValueChange={(next) =>
            change({
              radiusKm:
                next === NO_RADIUS ? null : (Number(next) as SearchRadius),
            })
          }
        />
      ) : null}
    </FilterGroup>
  );
}

function parsePrice(text: string): number | null {
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Math.min(Number(digits), PRICE_LIMIT);
}

/** Preisrahmen als zwei Zahlenfelder; sie wirken beim Verlassen des Felds oder mit Enter. */
function PriceFields({
  min,
  max,
  onCommit,
}: {
  min: number | null;
  max: number | null;
  onCommit: (min: number | null, max: number | null) => void;
}) {
  const t = useTranslations("search.filters");
  const [draft, setDraft] = useState({
    min: min?.toString() ?? "",
    max: max?.toString() ?? "",
  });
  const [applied, setApplied] = useState({ min, max });
  // Ändert sich der Preis von aussen (Chip entfernt, zurückgesetzt), folgen die Felder.
  if (applied.min !== min || applied.max !== max) {
    setApplied({ min, max });
    setDraft({ min: min?.toString() ?? "", max: max?.toString() ?? "" });
  }
  const commit = () => {
    const nextMin = parsePrice(draft.min);
    const nextMax = parsePrice(draft.max);
    if (nextMin !== min || nextMax !== max) onCommit(nextMin, nextMax);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t("priceMin")}
          inputMode="numeric"
          autoComplete="off"
          value={draft.min}
          onChange={(event) =>
            setDraft({ ...draft, min: event.currentTarget.value })
          }
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
        <TextField
          label={t("priceMax")}
          inputMode="numeric"
          autoComplete="off"
          value={draft.max}
          onChange={(event) =>
            setDraft({ ...draft, max: event.currentTarget.value })
          }
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      </div>
      <p className="text-small text-ink-muted">{t("priceHint")}</p>
    </div>
  );
}
