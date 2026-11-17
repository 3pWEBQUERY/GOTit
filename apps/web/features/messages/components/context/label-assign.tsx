"use client";

import { Checkbox } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { setConversationLabelsAction } from "../../actions/labels";
import type { ClientLabel } from "../../lib/types";

/**
 * Labels der Unterhaltung (v1 FR-CHAT-003): Ein Häkchen speichert sofort, die
 * Bestätigung steht am Ort (PRD 13, Speichern). Nur die Anbieterseite sieht sie.
 */
export function LabelAssign({
  conversationId,
  labels,
  selected,
}: {
  conversationId: string;
  labels: readonly ClientLabel[];
  selected: readonly string[];
}) {
  const t = useTranslations("messages.context");
  const router = useRouter();
  const [current, setCurrent] = useOptimistic<readonly string[]>(selected);
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const [, startTransition] = useTransition();

  function toggle(labelId: string, on: boolean) {
    const next = on
      ? [...current.filter((id) => id !== labelId), labelId]
      : current.filter((id) => id !== labelId);
    startTransition(async () => {
      setCurrent(next);
      const ok = await setConversationLabelsAction(conversationId, [
        ...next,
      ]).catch(() => false);
      setStatus(ok ? "saved" : "failed");
      router.refresh();
    });
  }

  return (
    <fieldset className="flex flex-col">
      <legend className="text-small font-[550] text-ink">{t("labels")}</legend>
      {labels.length === 0 ? (
        <p className="text-small text-ink-muted">{t("noLabels")}</p>
      ) : null}
      {labels.map((label) => (
        <Checkbox
          key={label.id}
          label={label.name}
          checked={current.includes(label.id)}
          onCheckedChange={(checked) => toggle(label.id, checked === true)}
        />
      ))}
      <p
        role="status"
        className={
          status === "failed"
            ? "text-small text-error"
            : "text-small text-ink-muted"
        }
      >
        {status === "saved"
          ? t("labelsSaved")
          : status === "failed"
            ? t("labelsFailed")
            : ""}
      </p>
    </fieldset>
  );
}
