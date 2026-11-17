"use client";

import { Button, InlineAlert, TextArea, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import type { ActionResult } from "../account/action-result";
import { appealMediaCaseAction, appealRestrictionAction } from "./actions/appeal";

/**
 * Einspruch des betroffenen Kontos (v1 9.2, v2 12.4): ein Text mit
 * mindestens 20 Zeichen, einmal. Gegen eine Einschränkung oder gegen den
 * Entscheid zu einem eigenen Medium.
 */
export function AppealForm({ target, label }: { target: { kind: "restriction"; id: string } | { kind: "media"; id: string }; label?: string }) {
  const t = useTranslations("moderation.member.appeal");
  const router = useRouter();
  const { toast } = useToast();
  const fieldId = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const text = (key: string) => (t.has(`errors.${key}`) ? t(`errors.${key}`) : t("errors.generic"));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim().length < 20) {
      setError("tooShort");
      document.getElementById(fieldId)?.focus();
      return;
    }
    setPending(true);
    setFormError(null);
    const action = target.kind === "restriction" ? appealRestrictionAction : appealMediaCaseAction;
    const result: ActionResult = await action(target.id, reason).catch(() => ({ ok: false, formError: "generic" }));
    setPending(false);
    if (result.ok) {
      toast({ title: t("sent"), tone: "success" });
      router.refresh();
      return;
    }
    setError(result.fieldErrors?.reason ?? null);
    setFormError(result.formError ?? null);
    if (result.fieldErrors?.reason) document.getElementById(fieldId)?.focus();
    if (result.formError === "already" || result.formError === "notFound") router.refresh();
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-3" data-appeal-form={target.kind}>
      {formError ? <InlineAlert tone="error" title={text(formError)} /> : null}
      <TextArea
        id={fieldId}
        label={label ?? t("reason")}
        hint={t("reasonHint")}
        rows={4}
        maxLength={2000}
        value={reason}
        error={error ? text(error) : undefined}
        onChange={(event) => {
          setReason(event.target.value);
          // Der Hinweis verschwindet beim Tippen, nicht beim Verlassen: sonst verschiebt sich der Button unter dem Klick.
          if (error && event.target.value.trim().length >= 20) setError(null);
        }}
        onBlur={() => (reason.trim().length > 0 && reason.trim().length < 20 ? setError("tooShort") : undefined)}
      />
      <Button type="submit" loading={pending} className="self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
