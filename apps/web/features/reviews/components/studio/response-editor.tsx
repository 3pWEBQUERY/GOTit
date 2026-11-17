"use client";

import { RESPONSE_MAX } from "@app/core/review/schemas";
import {
  Button,
  ConfirmDialog,
  InlineAlert,
  TextArea,
  useToast,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { respondToReviewAction } from "../../actions/review";

function Failure({ code }: { code: string | null }) {
  const t = useTranslations("reviews.errors");
  if (!code) return null;
  return (
    <InlineAlert tone="error" title={t.has(code) ? t(code) : t("generic")} />
  );
}

/**
 * Stellungnahme schreiben, ändern oder entfernen (v1 FR-REVIEW-003): ein
 * Formular mit «Speichern»; Entfernen fragt nach, weil der Text verloren geht.
 */
export function ResponseEditor({
  reviewId,
  current,
}: {
  reviewId: string;
  current: string | null;
}) {
  const t = useTranslations("reviews.studio.response");
  const tErrors = useTranslations("reviews.errors");
  const router = useRouter();
  const { toast } = useToast();
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(value: string): Promise<boolean> {
    setFormError(null);
    const result = await respondToReviewAction(reviewId, value);
    if (result.ok) {
      router.refresh();
      return true;
    }
    if (result.reason === "invalid") setError("responseTooLong");
    else setFormError(result.reason);
    return false;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (text.trim().length === 0) {
      setError("responseEmpty");
      document.getElementById(fieldId)?.focus();
      return;
    }
    setPending(true);
    try {
      if (await save(text)) {
        setEditing(false);
        toast({ title: t("saved"), tone: "success" });
      }
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  const failure = <Failure code={formError} />;

  if (!editing)
    return (
      <div className="flex flex-col gap-3">
        {failure}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setText(current ?? "");
              setError(null);
              setEditing(true);
            }}
          >
            {current ? t("edit") : t("write")}
          </Button>
          {current ? (
            <ConfirmDialog
              trigger={<Button variant="quiet">{t("remove")}</Button>}
              title={t("removeTitle")}
              description={t("removeText")}
              confirmLabel={t("removeConfirm")}
              cancelLabel={t("keep")}
              onConfirm={async () => {
                if (!(await save(""))) throw new Error("remove-failed");
                toast({ title: t("removed"), tone: "success" });
              }}
            />
          ) : null}
        </div>
      </div>
    );

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-3"
      data-response-form={reviewId}
    >
      {failure}
      <TextArea
        id={fieldId}
        label={t("label")}
        hint={t("hint")}
        rows={4}
        maxLength={RESPONSE_MAX}
        countLabel={(used, max) => t("count", { used, max })}
        value={text}
        error={error ? tErrors(error) : undefined}
        onChange={(event) => {
          setText(event.target.value);
          if (error) setError(null);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {t("save")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
