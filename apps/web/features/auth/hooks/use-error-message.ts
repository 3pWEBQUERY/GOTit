"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/** Übersetzt einen Fehlerschlüssel aus den Schemas; Unbekanntes wird zu einem allgemeinen Satz. */
export function useErrorMessage(): (key: string | undefined) => string | undefined {
  const t = useTranslations("auth.errors");
  return useCallback((key: string | undefined) => {
    if (!key) return undefined;
    return t.has(key) ? t(key) : t("invalid");
  }, [t]);
}
