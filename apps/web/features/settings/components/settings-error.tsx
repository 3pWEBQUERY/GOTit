"use client";

import { Button, ErrorState } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Fehlerzustand eines Abschnitts. Die Navigation der Einstellungen bleibt daneben bedienbar. */
export function SettingsError({ reset }: { reset: () => void }) {
  const t = useTranslations("settings.state");
  const router = useRouter();
  return (
    <div className="flex flex-col">
      <h1 className="sr-only">{t("errorTitle")}</h1>
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
