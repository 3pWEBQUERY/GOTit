"use client";

import type { Locale } from "@app/core/locale";
import { registrationSchema } from "../lib/account-schemas";
import { Button, TextField, UiLink } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { register } from "@/features/account/actions/register";
import { getPathname, useRouter } from "@/i18n/navigation";
import { useErrorMessage } from "../hooks/use-error-message";
import { useSchemaForm } from "../hooks/use-schema-form";
import { accountTypeFor, needsOrganization, organizationKindFor, type AccountChoice } from "../lib/account-choice";
import { focusFirstError, summaryItems } from "../lib/first-error";
import { rememberPendingEmail } from "../lib/pending-email";
import { AccountTypeField } from "./account-type-field";
import { ConsentFields } from "./consent-fields";
import { ErrorSummary } from "./error-summary";
import { FormProblemAlert, type FormProblem } from "./form-problem";
import { RegistrationClosed } from "./registration-closed";

interface RegisterValues {
  accountType: AccountChoice | "";
  name: string;
  organizationName: string;
  email: string;
  password: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
}

const INITIAL: RegisterValues = { accountType: "", name: "", organizationName: "", email: "", password: "", ageConfirmed: false, termsAccepted: false };
const ORDER = ["accountType", "name", "organizationName", "email", "password", "ageConfirmed", "termsAccepted"] as const;
const idFor = (name: string) => `register-${name}`;

function toInput(values: RegisterValues) {
  return {
    accountType: accountTypeFor(values.accountType),
    name: values.name,
    organizationName: needsOrganization(values.accountType) ? values.organizationName : undefined,
    organizationKind: organizationKindFor(values.accountType),
    email: values.email,
    password: values.password,
    ageConfirmed: values.ageConfirmed,
    termsAccepted: values.termsAccepted,
  };
}

/** Registrierung (PRD 7.4, Abnahme 1–5): Prüfung mit `registrationSchema`, Senden über die Server Action. */
export function RegisterForm({ locale, returnTo }: { locale: Locale; returnTo?: string }) {
  const t = useTranslations("auth.register");
  const message = useErrorMessage();
  const router = useRouter();
  const form = useSchemaForm(registrationSchema, INITIAL, toInput);
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [closed, setClosed] = useState(false);
  const [pending, startTransition] = useTransition();
  const { values, errors } = form;

  if (closed) return <RegistrationClosed locale={locale} />;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setProblem(null);
    const checked = form.validate();
    if (!checked.ok) return focusFirstError(ORDER, checked.errors, idFor);
    startTransition(async () => {
      try {
        const result = await register(locale, toInput(values), returnTo);
        if (result.ok) {
          rememberPendingEmail(checked.data.email);
          router.push("/registrieren/bestaetigen");
          return;
        }
        if (result.formError === "registrationClosed") return setClosed(true);
        if (result.formError === "rateLimited") return setProblem({ kind: "rateLimited", retryAfterSeconds: result.retryAfterSeconds ?? 3600 });
        if (result.fieldErrors) {
          form.setErrors(result.fieldErrors);
          return focusFirstError(ORDER, result.fieldErrors, idFor);
        }
        setProblem({ kind: "unexpected" });
      } catch {
        setProblem({ kind: "network" });
      }
    });
  }

  const organization = needsOrganization(values.accountType);

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      {form.submitted ? <ErrorSummary items={summaryItems(ORDER, errors, idFor, message)} /> : null}
      <FormProblemAlert problem={problem} />
      <AccountTypeField id={idFor("accountType")} value={values.accountType} error={message(errors.accountType)} onChange={(choice) => form.setValue("accountType", choice, { validate: true })} />
      <TextField
        id={idFor("name")}
        label={t("name.label")}
        hint={t("name.hint")}
        autoComplete="name"
        value={values.name}
        error={message(errors.name)}
        onChange={(event) => form.setValue("name", event.target.value)}
        onBlur={(event) => form.blur("name", event.relatedTarget)}
      />
      {organization ? (
        <TextField
          id={idFor("organizationName")}
          label={t(values.accountType === "agency" ? "organizationName.agency" : "organizationName.club")}
          autoComplete="organization"
          value={values.organizationName}
          error={message(errors.organizationName)}
          onChange={(event) => form.setValue("organizationName", event.target.value)}
          onBlur={(event) => form.blur("organizationName", event.relatedTarget)}
        />
      ) : null}
      <TextField
        id={idFor("email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        label={t("email.label")}
        hint={t("email.hint")}
        value={values.email}
        error={message(errors.email)}
        onChange={(event) => form.setValue("email", event.target.value)}
        onBlur={(event) => form.blur("email", event.relatedTarget)}
      />
      <TextField
        id={idFor("password")}
        type="password"
        autoComplete="new-password"
        label={t("password.label")}
        hint={t("password.hint")}
        value={values.password}
        error={message(errors.password)}
        onChange={(event) => form.setValue("password", event.target.value)}
        onBlur={(event) => form.blur("password", event.relatedTarget)}
      />
      <ConsentFields
        locale={locale}
        ids={{ ageConfirmed: idFor("ageConfirmed"), termsAccepted: idFor("termsAccepted") }}
        values={values}
        errors={{ ageConfirmed: message(errors.ageConfirmed), termsAccepted: message(errors.termsAccepted) }}
        onChange={(name, checked) => form.setValue(name, checked, { validate: true })}
      />
      <Button type="submit" variant="primary" width="full" loading={pending}>
        {t("submit")}
      </Button>
      <p className="text-small text-ink-muted">
        {t("haveAccount")}{" "}
        <UiLink href={getPathname({ href: "/anmelden", locale })} className="text-ink underline underline-offset-2">
          {t("signIn")}
        </UiLink>
      </p>
    </form>
  );
}
