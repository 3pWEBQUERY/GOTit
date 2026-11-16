"use client";

import type { Locale } from "@app/core/locale";
import { Checkbox, UiLink } from "@app/ui";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { getPathname } from "@/i18n/navigation";

interface ConsentFieldsProps {
  locale: Locale;
  ids: { ageConfirmed: string; termsAccepted: string };
  values: { ageConfirmed: boolean; termsAccepted: boolean };
  errors: { ageConfirmed: string | undefined; termsAccepted: string | undefined };
  onChange: (name: "ageConfirmed" | "termsAccepted", checked: boolean) => void;
}

/** Volljährigkeit und Bedingungen (Abnahme 2). Die Rechtstexte öffnen in einem neuen Tab, damit nichts verloren geht. */
export function ConsentFields({ locale, ids, values, errors, onChange }: ConsentFieldsProps) {
  const t = useTranslations("auth.register");
  const legalLink = (href: "/recht/agb" | "/recht/datenschutz") =>
    function LegalLink(chunks: ReactNode) {
      return (
        <UiLink href={getPathname({ href, locale })} target="_blank" rel="noopener" className="underline underline-offset-2">
          {chunks}
        </UiLink>
      );
    };
  return (
    <div className="flex flex-col">
      <Checkbox
        id={ids.ageConfirmed}
        label={t("ageConfirmed")}
        checked={values.ageConfirmed}
        error={errors.ageConfirmed}
        onCheckedChange={(checked) => onChange("ageConfirmed", checked === true)}
      />
      <Checkbox
        id={ids.termsAccepted}
        label={t.rich("termsAccepted", { terms: legalLink("/recht/agb"), privacy: legalLink("/recht/datenschutz") })}
        description={t("termsNewTab")}
        checked={values.termsAccepted}
        error={errors.termsAccepted}
        onCheckedChange={(checked) => onChange("termsAccepted", checked === true)}
      />
    </div>
  );
}
