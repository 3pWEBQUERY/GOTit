"use client";

import { Button, InlineAlert, TextField, UiLink } from "@app/ui";
import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { requiresTwoFactor, useAuthClient } from "../hooks/use-auth-client";
import { useErrorMessage } from "../hooks/use-error-message";
import { useSchemaForm } from "../hooks/use-schema-form";
import { callAuth, type AuthOutcome } from "../lib/auth-outcome";
import { focusFirstError, summaryItems } from "../lib/first-error";
import { signInSchema } from "../lib/schemas";
import { ErrorSummary } from "./error-summary";
import { FormProblemAlert, type FormProblem } from "./form-problem";
import { ResendVerification } from "./resend-verification";
import { SuspendedAlert } from "./suspended-alert";

export interface SignInLinks {
  /** Ziel nach der Anmeldung, schon mit `safeReturnPath` geprüft. */
  target: string;
  twoFactor: string;
  forgotPassword: string;
  register: string;
  /** Ziel des Bestätigungslinks, falls die Adresse noch unbestätigt ist. */
  verifyCallback: string;
  /** Kontaktformular, für gesperrte Konten (Einspruch gegen eine Sperre). */
  contact: string;
}

type Rejection = "invalid" | "unverified" | "passkeyFailed" | "suspended" | null;

const ORDER = ["email", "password"] as const;
const idFor = (name: string) => `sign-in-${name}`;

/** Anmeldung mit E-Mail und Passwort oder Passkey (Abnahme 8–12). */
export function SignInForm({ links }: { links: SignInLinks }) {
  const t = useTranslations("auth.signIn");
  const message = useErrorMessage();
  const client = useAuthClient();
  const form = useSchemaForm(signInSchema, { email: "", password: "" });
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [rejection, setRejection] = useState<Rejection>(null);
  const [pending, startTransition] = useTransition();
  const [passkeyPending, startPasskey] = useTransition();

  function settle(outcome: AuthOutcome<unknown>, onRejected: (status: number) => Rejection) {
    if (outcome.kind === "ok") {
      window.location.assign(requiresTwoFactor(outcome.data) ? links.twoFactor : links.target);
      return;
    }
    // Gesperrt durch die Moderation (v1 9.2): Better Auth meldet FORBIDDEN mit eigenem Code.
    if (outcome.kind === "rejected") return setRejection(outcome.code === "ACCOUNT_SUSPENDED" ? "suspended" : onRejected(outcome.status));
    setProblem(outcome);
  }

  function reset() {
    setProblem(null);
    setRejection(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    reset();
    const checked = form.validate();
    if (!checked.ok) return focusFirstError(ORDER, checked.errors, idFor);
    startTransition(async () => {
      const { email, password } = checked.data;
      const outcome = await callAuth((fetchOptions) => client.signIn.email({ email, password, callbackURL: links.target, fetchOptions }));
      settle(outcome, (status) => (status === 403 ? "unverified" : "invalid"));
    });
  }

  function onPasskey() {
    if (passkeyPending) return;
    reset();
    startPasskey(async () => {
      const outcome = await callAuth((fetchOptions) => client.signIn.passkey({ fetchOptions }));
      settle(outcome, () => "passkeyFailed");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        {form.submitted ? <ErrorSummary items={summaryItems(ORDER, form.errors, idFor, message)} /> : null}
        <FormProblemAlert problem={problem} />
        {rejection === "suspended" ? (
          <SuspendedAlert contactHref={links.contact} />
        ) : null}
        {rejection === "invalid" || rejection === "passkeyFailed" ? (
          <InlineAlert tone="error" title={t(`${rejection}.title`)}>
            {t(`${rejection}.body`)}
          </InlineAlert>
        ) : null}
        <TextField
          id={idFor("email")}
          type="email"
          inputMode="email"
          autoComplete="username webauthn"
          label={t("email")}
          value={form.values.email}
          error={message(form.errors.email)}
          onChange={(event) => form.setValue("email", event.target.value)}
          onBlur={(event) => form.blur("email", event.relatedTarget)}
        />
        <TextField
          id={idFor("password")}
          type="password"
          autoComplete="current-password"
          label={t("password")}
          value={form.values.password}
          error={message(form.errors.password)}
          onChange={(event) => form.setValue("password", event.target.value)}
          onBlur={(event) => form.blur("password", event.relatedTarget)}
        />
        <p className="-mt-2">
          <UiLink href={links.forgotPassword} className="inline-flex min-h-11 items-center text-small text-ink underline underline-offset-2">
            {t("forgotPassword")}
          </UiLink>
        </p>
        <Button type="submit" variant="primary" width="full" loading={pending}>
          {t("submit")}
        </Button>
      </form>
      {rejection === "unverified" ? (
        <InlineAlert tone="warning" title={t("unverified.title")}>
          <div className="flex flex-col gap-3">
            <p>{t("unverified.body")}</p>
            <ResendVerification email={form.values.email} callbackURL={links.verifyCallback} idPrefix="sign-in-resend" />
          </div>
        </InlineAlert>
      ) : null}
      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <Button type="button" variant="secondary" width="full" icon={<KeyRound strokeWidth={1.5} aria-hidden />} loading={passkeyPending} onClick={onPasskey}>
          {t("passkey")}
        </Button>
        <p className="text-small text-ink-muted">
          {t("noAccount")}{" "}
          <UiLink href={links.register} className="text-ink underline underline-offset-2">
            {t("register")}
          </UiLink>
        </p>
      </div>
    </div>
  );
}
