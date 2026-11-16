"use client";

import { RadioGroup } from "@app/ui";
import { useTranslations } from "next-intl";
import { ACCOUNT_CHOICES, isAccountChoice, type AccountChoice } from "../lib/account-choice";

interface AccountTypeFieldProps {
  id: string;
  value: AccountChoice | "";
  error: string | undefined;
  onChange: (choice: AccountChoice) => void;
}

/** Kontotyp als Auswahl mit je einem Satz Erklärung. */
export function AccountTypeField({ id, value, error, onChange }: AccountTypeFieldProps) {
  const t = useTranslations("auth.register.accountType");
  const options = ACCOUNT_CHOICES.map((choice) => ({ value: choice, label: t(`${choice}.label`), description: t(`${choice}.description`) }));
  return (
    <div id={id}>
      <RadioGroup
        label={t("label")}
        options={options}
        value={value}
        error={error}
        name="accountType"
        onValueChange={(next) => {
          if (isAccountChoice(next)) onChange(next);
        }}
      />
    </div>
  );
}
