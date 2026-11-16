import type { Locale } from "@app/core/locale";
import { getLocale } from "next-intl/server";
import { NotFoundContent } from "@/features/system/components/not-found-content";

export default async function InfoNotFound() {
  return <NotFoundContent locale={(await getLocale()) as Locale} />;
}
