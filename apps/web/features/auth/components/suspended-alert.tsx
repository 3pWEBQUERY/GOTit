"use client";

import { Button, InlineAlert, UiLink } from "@app/ui";
import { useTranslations } from "next-intl";

/** Gesperrtes Konto (v1 9.2): klarer Satz und der Weg zum Kontaktformular für einen Einspruch. */
export function SuspendedAlert({ contactHref }: { contactHref: string }) {
  const t = useTranslations("auth.signIn.suspended");
  return (
    <InlineAlert
      tone="error"
      title={t("title")}
      action={
        <Button asChild variant="secondary">
          <UiLink href={contactHref}>{t("contact")}</UiLink>
        </Button>
      }
    >
      {t("body")}
    </InlineAlert>
  );
}
