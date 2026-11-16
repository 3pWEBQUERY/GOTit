"use client";

import { passwordResetRequestSchema } from "../lib/account-schemas";
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

const ORDER = ["email"] as const;
const idFor = () => "forgot-email";

/**
 * «Passwort vergessen» (Abnahme 13). Die Antwort ist für bekannte und
 * unbekannte Adressen dieselbe; nur Rate Limit und Verbindung sind Probleme.
 */
export function ForgotPasswordForm({ redirectTo, signInHref }: { redirectTo: string; signInHref: string }) {
  const t = useTranslations("auth.forgot");
  const message = useErrorMessage();
  const client = useAuthClient();
  const form = useSchemaForm(passwordResetRequestSchema, { email: "" });
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setProblem(null);
    const checked = form.validate();
    if (!checked.ok) return focusFirstError(ORDER, checked.errors, idFor);
    startTransition(async () => {
      const outcome = await callAuth((fetchOptions) => client.requestPasswordReset({ email: checked.data.email, redirectTo, fetchOptions }));
      if (outcome.kind === "rateLimited" || outcome.kind === "network") return setProblem(outcome);
      setSent(true);
    });
  }

  const back = (
    <UiLink href={signInHref} className="inline-flex min-h-11 items-center text-small text-ink underline underline-offset-2">
      {t("backToSignIn")}
    </UiLink>
  );

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <InlineAlert tone="success" title={t("sent.title")}>
          {t("sent.body")}
        </InlineAlert>
        <p>{back}</p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      {form.submitted ? <ErrorSummary items={summaryItems(ORDER, form.errors, idFor, message)} /> : null}
      <FormProblemAlert problem={problem} />
      <TextField
        id={idFor()}
        type="email"
        inputMode="email"
        autoComplete="email"
        label={t("email")}
        value={form.values.email}
        error={message(form.errors.email)}
        onChange={(event) => form.setValue("email", event.target.value)}
        onBlur={() => form.blur("email")}
      />
      <Button type="submit" variant="primary" width="full" loading={pending}>
        {t("submit")}
      </Button>
      <p>{back}</p>
    </form>
  );
}
