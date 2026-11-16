"use client";

import { Button, ErrorState } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Fehlerzustand der Übersicht: was passiert ist, was erhalten blieb, was jetzt geht. */
export function MemberOverviewError({ reset }: { reset: () => void }) {
  const t = useTranslations("member.overview");
  const router = useRouter();
  return (
    <div className="max-w-reading">
      <h1 className="sr-only">{t("title")}</h1>
      <ErrorState
        title={t("errorTitle")}
        description={t("errorDescription")}
        action={
          <Button
            variant="primary"
            onClick={() => {
              reset();
              router.refresh();
            }}
          >
            {t("reload")}
          </Button>
        }
      />
    </div>
  );
}
