"use client";

import { useTranslations } from "next-intl";

/** Übersetzt einen Fehlerschlüssel aus `admin.errors`; Unbekanntes wird zur allgemeinen Meldung. */
export function useAdminErrorText() {
  const t = useTranslations("admin.errors");
  return (key: string) => (t.has(key) ? t(key) : t("generic"));
}
