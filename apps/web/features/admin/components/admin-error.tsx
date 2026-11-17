"use client";

import { Button, ErrorState } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Fehlerzustand einer Admin-Seite. Seitenleiste und Kopf bleiben bedienbar. */
export function AdminError({ reset }: { reset: () => void }) {
  const t = useTranslations("admin.state");
  const router = useRouter();
  return (
    <>
      <h1 className="text-h1">{t("errorTitle")}</h1>
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
    </>
  );
}
