"use client";

import { Button, ErrorState } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Fehlerzustand von Profilseite und Editor: was passiert ist, was erhalten blieb, was jetzt geht (PRD 13). */
export function ProfileError({ reset }: { reset: () => void }) {
  const t = useTranslations("profile.state");
  const router = useRouter();
  return (
    <div className="flex max-w-prose flex-col">
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
