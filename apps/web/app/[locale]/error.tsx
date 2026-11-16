"use client";

import { Button, ErrorState } from "@app/ui";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** 500: sagt, was passiert ist, was erhalten blieb und was jetzt geht (PRD 13). */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("system.error");
  return (
    <main id="inhalt" className="mx-auto w-full max-w-reading px-4 py-12">
      <h1 className="sr-only">{t("title")}</h1>
      <ErrorState
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={reset}>
              {t("retry")}
            </Button>
            <Button asChild variant="secondary">
              <Link href="/">{t("home")}</Link>
            </Button>
          </div>
        }
      />
    </main>
  );
}
