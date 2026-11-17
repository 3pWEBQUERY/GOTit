"use client";

import { APPEAL_MAX } from "@app/core/review/schemas";
import { Button, InlineAlert, TextArea, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { dismissAppealAction } from "../../actions/moderate";

/** Einspruch abweisen, mit Begründung fürs Audit-Log; die Bewertung bleibt, wie sie ist. */
export function DismissAppealForm({ appealId }: { appealId: string }) {
  const t = useTranslations("reviews.admin.dismiss");
  const tErrors = useTranslations("reviews.admin.errors");
  const router = useRouter();
  const { toast } = useToast();
  const fieldId = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorText = (key: string) =>
    tErrors.has(key) ? tErrors(key) : tErrors("generic");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    try {
      const result = await dismissAppealAction(appealId, reason);
      if (result.ok) {
        toast({ title: t("saved"), tone: "success" });
        router.refresh();
        return;
      }
      setError(result.fieldErrors?.reason ?? null);
      setFormError(result.formError ?? null);
      if (result.fieldErrors?.reason) document.getElementById(fieldId)?.focus();
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-3"
      data-dismiss-appeal={appealId}
    >
      {formError ? (
        <InlineAlert tone="error" title={errorText(formError)} />
      ) : null}
      <TextArea
        id={fieldId}
        label={t("reason")}
        hint={t("reasonHint")}
        rows={3}
        maxLength={APPEAL_MAX}
        value={reason}
        error={error ? errorText(error) : undefined}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="submit" loading={pending} className="self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
