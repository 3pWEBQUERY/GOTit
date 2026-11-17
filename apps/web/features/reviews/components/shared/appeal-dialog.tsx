"use client";

import { APPEAL_MAX } from "@app/core/review/schemas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  InlineAlert,
  TextArea,
  useToast,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { appealReviewAction } from "../../actions/review";
import { reasonError } from "../../lib/form";

/**
 * Einspruch mit Grund (v1 FR-REVIEW-003, Entscheid 0017): der Autor gegen
 * eine abgelehnte oder entfernte Bewertung, der Anbieter gegen eine
 * veröffentlichte. Der Dialog nennt, was danach geschieht.
 */
export function AppealDialog({
  reviewId,
  side,
}: {
  reviewId: string;
  side: "member" | "provider";
}) {
  const t = useTranslations("reviews.appeal");
  const tErrors = useTranslations("reviews.errors");
  const router = useRouter();
  const { toast } = useToast();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const local = reasonError(reason, APPEAL_MAX);
    if (local) {
      setError(local);
      document.getElementById(fieldId)?.focus();
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      const result = await appealReviewAction(reviewId, reason);
      if (result.ok) {
        setOpen(false);
        setReason("");
        setError(null);
        toast({ title: t("sent"), tone: "success" });
        router.refresh();
        return;
      }
      if (result.reason === "invalid") {
        setError("reasonTooShort");
        return;
      }
      setFormError(result.reason);
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button data-appeal-review={reviewId}>{t("trigger")}</Button>
      </DialogTrigger>
      <DialogContent
        title={t("title")}
        description={t(`description.${side}`)}
        closeLabel={t("close")}
      >
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-4"
        >
          {formError ? (
            <InlineAlert
              tone="error"
              title={
                tErrors.has(formError) ? tErrors(formError) : tErrors("generic")
              }
            />
          ) : null}
          <TextArea
            id={fieldId}
            label={t("reason")}
            hint={t("reasonHint")}
            rows={4}
            maxLength={APPEAL_MAX}
            countLabel={(used, max) => t("count", { used, max })}
            value={reason}
            error={error ? tErrors(error) : undefined}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError(null);
            }}
          />
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
