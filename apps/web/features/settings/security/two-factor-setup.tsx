"use client";

import { Button, InlineAlert, TextField } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { authErrorKey, settingsAuthClient } from "../auth-client";
import { BackupCodes } from "./backup-codes";
import { QrCode } from "./qr-code";

type Step = { kind: "idle" } | { kind: "password" } | { kind: "scan"; totpURI: string; secret: string; backupCodes: string[] } | { kind: "backup"; backupCodes: string[] };

function secretFrom(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

/** Gruppen zu vier Zeichen, damit sich der Schlüssel abtippen lässt. */
function grouped(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

function StepActions({ submitLabel, cancelLabel, pending, onCancel }: { submitLabel: string; cancelLabel: string; pending: boolean; onCancel: () => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" variant="primary" loading={pending}>
        {submitLabel}
      </Button>
      <Button variant="quiet" onClick={onCancel}>
        {cancelLabel}
      </Button>
    </div>
  );
}

/**
 * Zweiten Faktor einrichten (PRD 7.5): Passwort bestätigen, QR-Code oder
 * Schlüssel, Code bestätigen, danach die Ersatzcodes sichern.
 */
export function TwoFactorSetup({ onFinished }: { onFinished: () => void }) {
  const t = useTranslations("settings");
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ field: "password" | "code" | "form"; key: string } | null>(null);
  const [pending, setPending] = useState(false);
  const errorText = (field: "password" | "code" | "form") => (error?.field === field ? t(`errors.${error.key}`) : undefined);

  function cancel() {
    setStep({ kind: "idle" });
    setPassword("");
    setCode("");
    setError(null);
  }

  async function confirmPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return setError({ field: "password", key: "passwordRequired" });
    setPending(true);
    try {
      const { data, error: authError } = await settingsAuthClient().twoFactor.enable({ password });
      if (authError || !data || !("totpURI" in data)) {
        const key = authErrorKey(authError);
        return setError(key === "passwordWrong" ? { field: "password", key } : { field: "form", key });
      }
      setError(null);
      setPassword("");
      setStep({ kind: "scan", totpURI: data.totpURI, secret: secretFrom(data.totpURI), backupCodes: data.backupCodes });
    } catch {
      setError({ field: "form", key: "generic" });
    } finally {
      setPending(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>, backupCodes: string[]) {
    event.preventDefault();
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) return setError({ field: "code", key: "codeFormat" });
    setPending(true);
    try {
      const { error: authError } = await settingsAuthClient().twoFactor.verifyTotp({ code: clean });
      if (authError) {
        const key = authErrorKey(authError);
        return setError(key === "codeInvalid" ? { field: "code", key } : { field: "form", key });
      }
      setError(null);
      setStep({ kind: "backup", backupCodes });
    } catch {
      setError({ field: "form", key: "generic" });
    } finally {
      setPending(false);
    }
  }

  const formError = errorText("form") ? <InlineAlert tone="error" title={errorText("form")} /> : null;

  if (step.kind === "idle") {
    return (
      <Button variant="primary" className="self-start" onClick={() => setStep({ kind: "password" })}>
        {t("security.twoFactor.start")}
      </Button>
    );
  }

  if (step.kind === "password") {
    return (
      <form noValidate onSubmit={(event) => void confirmPassword(event)} className="flex flex-col gap-4">
        <p className="text-body">{t("security.twoFactor.passwordStep")}</p>
        {formError}
        <TextField
          id="zweifaktor-passwort"
          type="password"
          autoComplete="current-password"
          label={t("security.twoFactor.password")}
          value={password}
          error={errorText("password")}
          onChange={(event) => setPassword(event.target.value)}
        />
        <StepActions submitLabel={t("security.twoFactor.confirmPassword")} cancelLabel={t("security.twoFactor.cancel")} pending={pending} onCancel={cancel} />
      </form>
    );
  }

  if (step.kind === "scan") {
    return (
      <form noValidate onSubmit={(event) => void verify(event, step.backupCodes)} className="flex flex-col gap-4">
        <p className="text-body">{t("security.twoFactor.scanStep")}</p>
        <QrCode value={step.totpURI} alt={t("security.twoFactor.qrAlt")} />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-label text-ink-muted">{t("security.twoFactor.secretLabel")}</p>
          <code data-totp-secret={step.secret} className="tabular text-body break-all">
            {grouped(step.secret)}
          </code>
        </div>
        {formError}
        <TextField
          id="zweifaktor-code"
          label={t("security.twoFactor.code")}
          hint={t("security.twoFactor.codeHint")}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={code}
          error={errorText("code")}
          onChange={(event) => setCode(event.target.value)}
        />
        <StepActions submitLabel={t("security.twoFactor.verify")} cancelLabel={t("security.twoFactor.cancel")} pending={pending} onCancel={cancel} />
      </form>
    );
  }

  return <BackupCodes codes={step.backupCodes} onFinished={onFinished} />;
}
