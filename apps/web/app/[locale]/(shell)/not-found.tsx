import type { Locale } from "@app/core/locale";
import { getLocale } from "next-intl/server";
import { PageMain } from "@/features/shell/components/page-main";
import { NotFoundContent } from "@/features/system/components/not-found-content";

export default async function ShellNotFound() {
  return (
    <PageMain>
      <NotFoundContent locale={(await getLocale()) as Locale} />
    </PageMain>
  );
}
