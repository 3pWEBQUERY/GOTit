"use client";

import { passwordResetRequestSchema } from "../lib/account-schemas";
import { Button, InlineAlert, TextField } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { useAuthClient } from "../hooks/use-auth-client";
import { useErrorMessage } from "../hooks/use-error-message";
import { useSchemaForm } from "../hooks/use-schema-form";
import { callAuth } from "../lib/auth-outcome";
import { focusFirstError } from "../lib/first-error";
import { FormProblemAlert, type FormProblem } from "./form-problem";

interface ResendVerificationProps {
  /** Bekannte Adresse; ohne sie fragt das Formular danach. */
  email?: string | null;
  /** Ziel nach der Bestätigung, mit Sprachpräfix (bestimmt auch die Sprache der E-Mail). */
  callbackURL: string;
  idPrefix: string;
}

/**
 * «Bestätigungs-E-Mail erneut senden». Die Antwort ist immer dieselbe, ob ein
 * unbestätigtes Konto existiert oder nicht (Abnahme 12); nur ein Rate Limit
 * oder ein Verbindungsfehler erscheint als Problem am Ort.
 */
export function ResendVerification({ email, callbackURL, idPrefix }: ResendVerificationProps) {
  const t = useTranslations("auth.resend");
  const message = useErrorMessage();
  const client = useAuthClient();
  const form = useSchemaForm(passwordResetRequestSchema, { email: email ?? "" });
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const emailId = `${idPrefix}-email`;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setProblem(null);
    setSent(false);
    const checked = form.validate();
    if (!checked.ok) return focusFirstError(["email"], checked.errors, () => emailId);
    startTransition(async () => {
      const outcome = await callAuth((fetchOptions) => client.sendVerificationEmail({ email: checked.data.email, callbackURL, fetchOptions }));
      if (outcome.kind === "rateLimited" || outcome.kind === "network") return setProblem(outcome);
      setSent(true);
    });
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {email ? null : (
        <TextField
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          label={t("emailLabel")}
          value={form.values.email}
          error={message(form.errors.email)}
          onChange={(event) => form.setValue("email", event.target.value)}
          onBlur={(event) => form.blur("email", event.relatedTarget)}
        />
      )}
      <FormProblemAlert problem={problem} />
      {sent ? (
        <InlineAlert tone="success" title={t("sent.title")}>
          {t("sent.body")}
        </InlineAlert>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
