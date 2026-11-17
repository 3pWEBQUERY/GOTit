"use client";

import type { EditorValues } from "@app/core/provider-profile/schemas";
import { Checkbox, CheckboxGroup } from "@app/ui";
import { useTranslations } from "next-intl";
import type { FieldsProps } from "./types";

/**
 * Kontaktwege (PRD v1 FR-PROFILE-004). Kästchen statt Schalter, weil der
 * Abschnitt mit «Änderungen speichern» gespeichert wird (PRD 13).
 */
export function ContactFields({ value, onChange, disabled }: FieldsProps<EditorValues["contact"]>) {
  const t = useTranslations("profile.fields");
  return (
    <CheckboxGroup label={t("contactWays")} hint={t("contactWaysHint")}>
      <Checkbox
        id="profil-nachrichten"
        label={t("allowMessages")}
        description={t("allowMessagesHint")}
        disabled={disabled}
        checked={value.allowMessages}
        onCheckedChange={(checked) => onChange({ ...value, allowMessages: checked === true })}
      />
      <Checkbox
        id="profil-terminanfragen"
        label={t("allowBookingRequests")}
        description={t("allowBookingRequestsHint")}
        disabled={disabled}
        checked={value.allowBookingRequests}
        onCheckedChange={(checked) => onChange({ ...value, allowBookingRequests: checked === true })}
      />
    </CheckboxGroup>
  );
}
