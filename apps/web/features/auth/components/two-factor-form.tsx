"use client";

import { Button, Checkbox, InlineAlert, TextField, UiLink } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { useAuthClient } from "../hooks/use-auth-client";
import { useErrorMessage } from "../hooks/use-error-message";
import { useSchemaForm } from "../hooks/use-schema-form";
import { callAuth } from "../lib/auth-outcome";
import { focusFirstError, summaryItems } from "../lib/first-error";
import { backupCodeSchema, totpCodeSchema } from "../lib/schemas";
import { ErrorSummary } from "./error-summary";
import { FormProblemAlert, type FormProblem } from "./form-problem";

type Mode = "totp" | "backup";

const ORDER = ["code"] as const;
const LOCK_CODES = new Set(["ACCOUNT_TEMPORARILY_LOCKED", "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE"]);

/** Zweiter Faktor (Abnahme 9): Code aus der App oder Ersatzcode, optional dem Gerät 30 Tage vertrauen. */
export function TwoFactorForm({ target, signInHref }: { target: string; signInHref: string }) {
  const [mode, setMode] = useState<Mode>("totp");
  const t = useTranslations("auth.twoFactor");
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-ink-muted">{t(`${mode}.intro`)}</p>
      <CodeForm key={mode} mode={mode} target={target} signInHref={signInHref} />
      <div className="border-t border-border pt-6">
        <Button type="button" variant="quiet" onClick={() => setMode(mode === "totp" ? "backup" : "totp")}>
          {t(`${mode}.switch`)}
        </Button>
      </div>
    </div>
  );
}

function CodeForm({ mode, target, signInHref }: { mode: Mode; target: string; signInHref: string }) {
  const t = useTranslations("auth.twoFactor");
  const message = useErrorMessage();
  const client = useAuthClient();
  const form = useSchemaForm(mode === "totp" ? totpCodeSchema : backupCodeSchema, { code: "", trustDevice: false });
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [expired, setExpired] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pending, startTransition] = useTransition();
  const idFor = () => `two-factor-${mode}`;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setProblem(null);
    setLocked(false);
    const checked = form.validate();
    if (!checked.ok) return focusFirstError(ORDER, checked.errors, idFor);
    startTransition(async () => {
      const { code, trustDevice } = checked.data;
      const outcome = await callAuth((fetchOptions) =>
        mode === "totp" ? client.twoFactor.verifyTotp({ code, trustDevice, fetchOptions }) : client.twoFactor.verifyBackupCode({ code, trustDevice, fetchOptions }),
      );
      if (outcome.kind === "ok") return window.location.assign(target);
      if (outcome.kind !== "rejected") return setProblem(outcome);
      if (outcome.code === "INVALID_TWO_FACTOR_COOKIE") return setExpired(true);
      if (outcome.code && LOCK_CODES.has(outcome.code)) return setLocked(true);
      const errors = { code: mode === "totp" ? "codeWrong" : "backupCodeWrong" };
      form.setErrors(errors);
      focusFirstError(ORDER, errors, idFor);
    });
  }

  if (expired) {
    return (
      <InlineAlert
        tone="warning"
        title={t("expired.title")}
        action={
          <Button asChild variant="primary">
            <UiLink href={signInHref}>{t("expired.action")}</UiLink>
          </Button>
        }
      >
        {t("expired.body")}
      </InlineAlert>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      {form.submitted ? <ErrorSummary items={summaryItems(ORDER, form.errors, idFor, message)} /> : null}
      <FormProblemAlert problem={problem} />
      {locked ? (
        <InlineAlert tone="error" title={t("locked.title")}>
          {t("locked.body")}
        </InlineAlert>
      ) : null}
      <TextField
        id={idFor()}
        label={t(`${mode}.label`)}
        hint={t(`${mode}.hint`)}
        autoComplete="one-time-code"
        inputMode={mode === "totp" ? "numeric" : "text"}
        maxLength={mode === "totp" ? 6 : 32}
        spellCheck={false}
        autoCapitalize="off"
        className="max-w-panel"
        value={form.values.code}
        error={message(form.errors.code)}
        onChange={(event) => form.setValue("code", event.target.value)}
        onBlur={() => form.blur("code")}
      />
      <Checkbox
        label={t("trustDevice.label")}
        description={t("trustDevice.hint")}
        checked={form.values.trustDevice}
        onCheckedChange={(checked) => form.setValue("trustDevice", checked === true)}
      />
      <Button type="submit" variant="primary" width="full" loading={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
