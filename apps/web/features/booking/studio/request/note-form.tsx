"use client";

import { NOTE_MAX } from "@app/core/booking/schemas";
import { Button, TextArea } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { setProviderNoteAction } from "../../actions/act";

/** Private Notiz zur Terminanfrage mit Speichern-Button; das Mitglied sieht sie nie (Entscheid 0016). */
export function RequestNoteForm({
  requestId,
  note,
}: {
  requestId: string;
  note: string | null;
}) {
  const t = useTranslations("bookingStudio.request");
  const router = useRouter();
  const [value, setValue] = useState(note ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">(
    "idle",
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const result = await setProviderNoteAction(requestId, value).catch(() => ({
      ok: false,
    }));
    setStatus(result.ok ? "saved" : "failed");
    if (result.ok) router.refresh();
  }

  return (
    <form
      onSubmit={(event) => void save(event)}
      className="flex flex-col gap-2"
      data-provider-note
    >
      <TextArea
        label={t("note")}
        hideLabel
        hint={t("noteHint")}
        optionalLabel={t("optional")}
        value={value}
        maxLength={NOTE_MAX}
        onChange={(event) => {
          setValue(event.currentTarget.value);
          if (status !== "idle") setStatus("idle");
        }}
        autoGrow
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={status === "saving"}>
          {t("saveNote")}
        </Button>
        <p
          role="status"
          className={
            status === "failed"
              ? "text-small text-error"
              : "text-small text-ink-muted"
          }
        >
          {status === "saved"
            ? t("noteSaved")
            : status === "failed"
              ? t("noteFailed")
              : ""}
        </p>
      </div>
    </form>
  );
}
