"use client";

import { EMPTY_QUERY } from "@app/core/search/query";
import { Button, Select } from "@app/ui";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SearchBox } from "../../search/components/search-box";
import { searchUrl } from "../../search/url";

const ALL = "*";

export interface DiscoverSearchProps {
  searchPath: string;
  categories: readonly { slug: string; name: string }[];
}

/** Suchformular von Entdecken (PRD v2 9.1): Ort oder Name mit Vorschlägen, Kategorie, «Suchen» führt zu `/suche`. */
export function DiscoverSearch({
  searchPath,
  categories,
}: DiscoverSearchProps) {
  const t = useTranslations("discover.search");
  const router = useRouter();
  const [text, setText] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [category, setCategory] = useState(ALL);

  const go = (next: {
    text?: string;
    region?: string | null;
    category?: string;
  }) => {
    const q = (next.text ?? text).trim();
    const chosenCategory = next.category ?? category;
    router.push(
      searchUrl(
        { search: searchPath, preset: null },
        {
          ...EMPTY_QUERY,
          q: q || null,
          region: next.region === undefined ? region : next.region,
          categories: chosenCategory === ALL ? [] : [chosenCategory],
        },
      ),
    );
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    go({});
  };

  return (
    <form
      role="search"
      aria-label={t("legend")}
      onSubmit={submit}
      className="flex flex-col gap-3 md:flex-row md:items-end"
    >
      <SearchBox
        text={null}
        keepTextOnBlur
        onTextChange={setText}
        onChoose={(choice) => {
          if (choice.kind === "text") {
            setText(choice.text);
            setRegion(null);
            // Enter in der Liste ist der Wunsch zu suchen; Verlassen des Felds nicht.
            if (
              choice.text &&
              document.activeElement?.getAttribute("role") === "combobox"
            )
              go({ text: choice.text, region: null });
          } else if (choice.kind === "region")
            go({ text: "", region: choice.slug });
          else {
            setCategory(choice.slug);
            go({ text: "", region, category: choice.slug });
          }
        }}
        className="min-w-0 md:flex-1"
      />
      {categories.length > 0 ? (
        <Select
          label={t("category")}
          options={[
            { value: ALL, label: t("allCategories") },
            ...categories.map((entry) => ({
              value: entry.slug,
              label: entry.name,
            })),
          ]}
          value={category}
          onValueChange={setCategory}
          className="md:w-56"
        />
      ) : null}
      <Button
        type="submit"
        variant="primary"
        icon={<Search aria-hidden strokeWidth={1.5} />}
      >
        {t("submit")}
      </Button>
    </form>
  );
}
