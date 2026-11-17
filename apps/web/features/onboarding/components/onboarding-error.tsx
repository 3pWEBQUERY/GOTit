"use client";

import { Button, ErrorState } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Fehlerzustand eines Schritts: was passiert ist, was erhalten blieb, was jetzt geht (PRD 13). */
export function OnboardingError({ reset }: { reset: () => void }) {
  const t = useTranslations("onboarding.state");
  const router = useRouter();
  return (
    <div className="flex max-w-reading flex-col">
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
