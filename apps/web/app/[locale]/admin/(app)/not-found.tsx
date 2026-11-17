import type { Locale } from "@app/core/locale";
import { getLocale } from "next-intl/server";
import { AdminNotFound } from "@/features/admin/components/admin-not-found";

export default async function AdminCaseNotFound() {
  return <AdminNotFound locale={(await getLocale()) as Locale} />;
}
