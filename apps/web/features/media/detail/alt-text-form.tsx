"use client";

import { ALT_TEXT_MAX } from "@app/core/media/schemas";
import { Button, TextArea, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveAltText } from "../actions/arrange";

/** Alternativtext mit Speichern-Button (PRD 13: Formulare speichern mit Button). */
export function AltTextForm({ mediaId, initial }: { mediaId: string; initial: string }) {
  const t = useTranslations("media.detail");
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim().length > ALT_TEXT_MAX) {
      setError(t("altTextTooLong", { max: ALT_TEXT_MAX }));
      document.getElementById("alternativtext")?.focus();
      return;
    }
    setPending(true);
    const result = await saveAltText({ mediaId, altText: value }).catch(() => ({ ok: false as const, fieldErrors: undefined }));
    setPending(false);
    if (result.ok) {
      setError(null);
      toast({ title: t("altTextSaved"), tone: "success" });
      router.refresh();
      return;
    }
    setError(result.fieldErrors?.altText ? t("altTextTooLong", { max: ALT_TEXT_MAX }) : t("saveError"));
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-3" data-alt-text-form>
      <TextArea
        id="alternativtext"
        label={t("altText")}
        hint={t("altTextHint")}
        optionalLabel={t("optional")}
        rows={3}
        maxLength={ALT_TEXT_MAX}
        countLabel={(used, max) => t("count", { used, max })}
        value={value}
        error={error ?? undefined}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {t("altTextSave")}
      </Button>
    </form>
  );
}
