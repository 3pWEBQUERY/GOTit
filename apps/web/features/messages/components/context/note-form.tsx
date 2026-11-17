"use client";

import { NOTE_MAX_LENGTH } from "@app/core/messaging/schemas";
import { Button, TextArea } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { setNoteAction } from "../../actions/labels";

/** Private Notiz der Anbieterseite mit Speichern-Button; die Gegenseite sieht sie nie. */
export function NoteForm({
  conversationId,
  note,
}: {
  conversationId: string;
  note: string | null;
}) {
  const t = useTranslations("messages.context");
  const router = useRouter();
  const [value, setValue] = useState(note ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">(
    "idle",
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const ok = await setNoteAction(conversationId, value).catch(() => false);
    setStatus(ok ? "saved" : "failed");
    if (ok) router.refresh();
  }

  return (
    <form
      onSubmit={(event) => void save(event)}
      className="flex flex-col gap-2"
      data-note-form
    >
      <TextArea
        label={t("note")}
        hint={t("noteHint")}
        value={value}
        maxLength={NOTE_MAX_LENGTH}
        onChange={(event) => {
          setValue(event.currentTarget.value);
          if (status !== "idle") setStatus("idle");
        }}
        autoGrow
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" loading={status === "saving"}>
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
