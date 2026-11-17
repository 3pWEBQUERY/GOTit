import type { Locale } from "@app/core/locale";
import { InlineAlert } from "@app/ui";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

/** Formulare erst ab 1024 px; darunter ist der Admin nur lesend (PRD 12.4). */
export async function WideOnly({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = await getTranslations({ locale, namespace: "adminCommon.wideOnly" });
  return (
    <>
      <div className="hidden lg:contents">{children}</div>
      <div className="lg:hidden">
        <InlineAlert tone="info" title={t("title")}>
          {t("description")}
        </InlineAlert>
      </div>
    </>
  );
}
