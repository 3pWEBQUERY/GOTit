"use client";

import { Combobox, type ComboboxOption } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Wie `SUGGEST_MIN_LENGTH` im Kern: kürzere Eingaben fragen keine Vorschläge ab. */
const MIN_LENGTH = 2;
const DELAY_MS = 200;

interface SuggestionResponse {
  suggestions: (
    | { kind: "region" | "category"; slug: string; name: string }
    | { kind: "profile"; slug: string; name: string; href: string }
  )[];
}

export type SearchBoxChoice =
  | { kind: "text"; text: string }
  | { kind: "region"; slug: string }
  | { kind: "category"; slug: string };

export interface SearchBoxProps {
  /** Aktueller Freitext der Suche; das Feld zeigt ihn an. */
  text: string | null;
  onChoose: (choice: SearchBoxChoice) => void;
  /** Auf Entdecken bleibt getippter Text beim Verlassen des Felds stehen und wird mit «Suchen» gesendet. */
  keepTextOnBlur?: boolean;
  /** Meldet jeden getippten Text, zum Beispiel für ein umgebendes Formular. */
  onTextChange?: (text: string) => void;
  className?: string;
}

const TEXT = "text:";

/**
 * Freitext mit Vorschlägen (PRD v1 FR-SEARCH-005): Regionen setzen `ort`,
 * Kategorien `kategorie`, ein Profil öffnet die Profilseite, Enter sucht nach
 * dem Text. Die erste Option ist immer der getippte Text selbst.
 */
export function SearchBox({
  text,
  onChoose,
  keepTextOnBlur,
  onTextChange,
  className,
}: SearchBoxProps) {
  const t = useTranslations("search.box");
  const locale = useLocale();
  const router = useRouter();
  const [typed, setTyped] = useState<string | null>(null);
  const [value, setValue] = useState<string | null>(
    text ? `${TEXT}${text}` : null,
  );
  const [suggestions, setSuggestions] = useState<
    SuggestionResponse["suggestions"]
  >([]);

  // Neue Suche von aussen (Chip entfernt, zurückgesetzt): das Feld folgt.
  const [shownText, setShownText] = useState(text);
  if (shownText !== text) {
    setShownText(text);
    setValue(text ? `${TEXT}${text}` : null);
  }

  useEffect(() => {
    const term = typed?.trim() ?? "";
    if (term.length < MIN_LENGTH) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/suche/vorschlaege?${new URLSearchParams({ q: term, locale })}`,
          { signal: controller.signal },
        );
        if (response.ok)
          setSuggestions(
            ((await response.json()) as SuggestionResponse).suggestions,
          );
      } catch {
        // Ohne Vorschläge bleibt die Suche nach dem Text.
      }
    }, DELAY_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [typed, locale]);

  const term = typed?.trim() ?? "";
  const current = value?.startsWith(TEXT) ? value.slice(TEXT.length) : null;
  const options: ComboboxOption[] = [];
  if (term) options.push({ value: `${TEXT}${term}`, label: term });
  else if (current)
    options.push({ value: `${TEXT}${current}`, label: current });
  if (term.length >= MIN_LENGTH)
    for (const suggestion of suggestions) {
      const key = `${suggestion.kind}:${suggestion.slug}`;
      options.push({
        value: key,
        label: t(suggestion.kind, { name: suggestion.name }),
      });
    }

  const choose = (next: string | null) => {
    if (!next) {
      setValue(null);
      onChoose({ kind: "text", text: "" });
      return;
    }
    const [kind, ...rest] = next.split(":");
    const slug = rest.join(":");
    setTyped(null);
    if (kind === "profile") {
      const profile = suggestions.find(
        (entry) => entry.kind === "profile" && entry.slug === slug,
      );
      if (profile?.kind === "profile") router.push(profile.href);
      return;
    }
    if (kind === "region" || kind === "category") {
      setValue(null);
      onChoose({ kind, slug });
      return;
    }
    setValue(next);
    onChoose({ kind: "text", text: slug });
  };

  return (
    <Combobox
      label={t("label")}
      placeholder={t("placeholder")}
      options={options}
      filter="none"
      value={value}
      onValueChange={choose}
      onQueryChange={(next) => {
        setTyped(next);
        onTextChange?.(next);
      }}
      onBlur={() => {
        if (keepTextOnBlur && term && `${TEXT}${term}` !== value) {
          setValue(`${TEXT}${term}`);
          onChoose({ kind: "text", text: term });
        }
        setTyped(null);
      }}
      emptyLabel={t("empty")}
      className={className}
    />
  );
}
