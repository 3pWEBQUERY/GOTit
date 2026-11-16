"use client";

import { passwordResetSchema } from "../lib/account-schemas";
import { Button, InlineAlert, TextField, UiLink } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { useAuthClient } from "../hooks/use-auth-client";
import { useErrorMessage } from "../hooks/use-error-message";
import { useSchemaForm } from "../hooks/use-schema-form";
import { callAuth } from "../lib/auth-outcome";
import { focusFirstError, summaryItems } from "../lib/first-error";
import { ErrorSummary } from "./error-summary";
import { FormProblemAlert, type FormProblem } from "./form-problem";
import { InvalidResetLink } from "./invalid-reset-link";

const ORDER = ["password", "passwordRepeat"] as const;
const idFor = (name: string) => `reset-${name}`;

interface ResetPasswordFormProps {
  token: string;
  forgotHref: string;
  signInHref: string;
}

/** Neues Passwort mit Wiederholung (Abnahme 14). Better Auth beendet danach alle Sitzungen. */
export function ResetPasswordForm({ token, forgotHref, signInHref }: ResetPasswordFormProps) {
  const t = useTranslations("auth.reset");
  const message = useErrorMessage();
  const client = useAuthClient();
  const form = useSchemaForm(passwordResetSchema, { token, password: "", passwordRepeat: "" });
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [state, setState] = useState<"form" | "invalid" | "done">("form");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setProblem(null);
    const checked = form.validate();
    if (!checked.ok) {
      if (checked.errors.token) return setState("invalid");
      return focusFirstError(ORDER, checked.errors, idFor);
    }
    startTransition(async () => {
      const outcome = await callAuth((fetchOptions) => client.resetPassword({ newPassword: checked.data.password, token: checked.data.token, fetchOptions }));
      if (outcome.kind === "ok") return setState("done");
      if (outcome.kind === "rejected") return outcome.status === 400 ? setState("invalid") : setProblem({ kind: "unexpected" });
      setProblem(outcome);
    });
  }

  if (state === "invalid") return <InvalidResetLink forgotHref={forgotHref} />;
  if (state === "done") {
    return (
      <InlineAlert
        tone="success"
        title={t("done.title")}
        action={
          <Button asChild variant="primary">
            <UiLink href={signInHref}>{t("done.action")}</UiLink>
          </Button>
        }
      >
        {t("done.body")}
      </InlineAlert>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      {form.submitted ? <ErrorSummary items={summaryItems(ORDER, form.errors, idFor, message)} /> : null}
      <FormProblemAlert problem={problem} />
      <InlineAlert tone="info" title={t("devices.title")}>
        {t("devices.body")}
      </InlineAlert>
      <TextField
        id={idFor("password")}
        type="password"
        autoComplete="new-password"
        label={t("password.label")}
        hint={t("password.hint")}
        value={form.values.password}
        error={message(form.errors.password)}
        onChange={(event) => form.setValue("password", event.target.value)}
        onBlur={() => form.blur("password")}
      />
      <TextField
        id={idFor("passwordRepeat")}
        type="password"
        autoComplete="new-password"
        label={t("passwordRepeat")}
        value={form.values.passwordRepeat}
        error={message(form.errors.passwordRepeat)}
        onChange={(event) => form.setValue("passwordRepeat", event.target.value)}
        onBlur={() => form.blur("passwordRepeat")}
      />
      <Button type="submit" variant="primary" width="full" loading={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
