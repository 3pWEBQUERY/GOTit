"use client";

import { Button, TextField, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { updateProfile } from "../../account/actions/update-profile";
import { checkProfile } from "../actions/check-profile";
import { FormErrorSummary } from "../components/form-error-summary";
import { useFormErrors } from "../hooks/use-form-errors";

const IDS = { name: "profil-name", username: "profil-benutzername" } as const;
type Field = keyof typeof IDS;

export interface ProfileFormProps {
  initial: { name: string; username: string };
  email: string;
}

/** Name und Benutzername mit Speichern-Button; die E-Mail-Adresse steht nur zum Lesen da (PRD 7.5). */
export function ProfileForm({ initial, email }: ProfileFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const form = useFormErrors(IDS);

  function change(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function blur(field: Field) {
    try {
      form.applyField(field, await checkProfile(values));
    } catch {
      // Die Prüfung beim Verlassen ist eine Hilfe; beim Speichern wird ohnehin geprüft.
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await updateProfile(values);
      if (result.ok) {
        form.clear();
        toast({ title: t("profile.saved"), tone: "success" });
        router.refresh();
      } else {
        form.applyAll(result.fieldErrors ?? {}, result.formError ?? (result.fieldErrors ? null : "generic"));
      }
    } catch {
      form.setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <FormErrorSummary title={t("form.summaryTitle")} entries={form.summary} formError={form.formError} />
      <TextField
        id={IDS.name}
        name="name"
        label={t("profile.name")}
        hint={t("profile.nameHint")}
        autoComplete="name"
        value={values.name}
        error={form.errorText("name")}
        onChange={(event) => change("name", event.target.value)}
        onBlur={() => void blur("name")}
      />
      <TextField
        id={IDS.username}
        name="username"
        label={t("profile.username")}
        hint={t("profile.usernameHint")}
        optionalLabel={t("form.optional")}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        value={values.username}
        error={form.errorText("username")}
        onChange={(event) => change("username", event.target.value)}
        onBlur={() => void blur("username")}
      />
      <TextField id="profil-email" label={t("profile.email")} hint={t("profile.emailHint")} value={email} readOnly type="email" />
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {t("profile.save")}
      </Button>
    </form>
  );
}
