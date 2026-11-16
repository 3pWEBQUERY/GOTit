"use client";

import { Button, Checkbox, TextField, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { checkPasswordChange } from "../actions/check-password-change";
import { authErrorKey, settingsAuthClient } from "../auth-client";
import { FormErrorSummary } from "../components/form-error-summary";
import { useFormErrors } from "../hooks/use-form-errors";

const IDS = { currentPassword: "passwort-aktuell", newPassword: "passwort-neu", newPasswordRepeat: "passwort-wiederholen" } as const;
type Field = keyof typeof IDS;

const EMPTY = { currentPassword: "", newPassword: "", newPasswordRepeat: "" };

/** Passwort ändern, wahlweise mit Abmeldung der anderen Geräte. Geändert wird über den Auth-Client, damit dessen Rate Limit greift. */
export function PasswordForm() {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState(EMPTY);
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [pending, setPending] = useState(false);
  const form = useFormErrors(IDS);

  const input = () => ({ ...values, revokeOtherSessions });

  async function blur(field: Field) {
    if (!values[field]) return;
    try {
      form.applyField(field, await checkPasswordChange(input()));
    } catch {
      // Die Prüfung beim Verlassen ist eine Hilfe; beim Absenden wird ohnehin geprüft.
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const errors = await checkPasswordChange(input());
      if (form.applyAll(errors, errors.form ?? null)) return;
      const { error } = await settingsAuthClient().changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions,
      });
      if (error) {
        const key = authErrorKey(error);
        if (key === "passwordWrong") form.applyAll({ currentPassword: key });
        else form.applyAll({}, key);
        return;
      }
      form.clear();
      setValues(EMPTY);
      toast({ title: revokeOtherSessions ? t("security.password.savedRevoked") : t("security.password.saved"), tone: "success" });
      router.refresh();
    } catch {
      form.setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  function field(name: Field, label: string, autoComplete: string, hint?: string) {
    return (
      <TextField
        id={IDS[name]}
        name={name}
        type="password"
        label={label}
        hint={hint}
        autoComplete={autoComplete}
        value={values[name]}
        error={form.errorText(name)}
        onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
        onBlur={() => void blur(name)}
      />
    );
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <FormErrorSummary title={t("form.summaryTitle")} entries={form.summary} formError={form.formError} />
      {field("currentPassword", t("security.password.current"), "current-password")}
      {field("newPassword", t("security.password.new"), "new-password", t("security.password.newHint"))}
      {field("newPasswordRepeat", t("security.password.repeat"), "new-password")}
      <Checkbox
        label={t("security.password.revokeOthers")}
        description={t("security.password.revokeOthersHint")}
        checked={revokeOtherSessions}
        onCheckedChange={(checked) => setRevokeOtherSessions(checked === true)}
      />
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {t("security.password.save")}
      </Button>
    </form>
  );
}
