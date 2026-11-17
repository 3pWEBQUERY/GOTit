"use client";

import { ConfirmDialog, InlineAlert } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { deleteMedia } from "../actions/arrange";

/**
 * Rückfrage vor dem endgültigen Löschen (PRD 13): benennt die Folge, Button
 * «Medium löschen». Bei einem Fehler bleibt der Dialog offen und sagt, dass
 * nichts verloren ging.
 */
export function DeleteMediaDialog({ mediaIds, open, onOpenChange, onDeleted }: { mediaIds: readonly string[]; open: boolean; onOpenChange: (open: boolean) => void; onDeleted: (count: number) => void }) {
  const t = useTranslations("media.deleteDialog");
  const [failed, setFailed] = useState(false);
  const many = mediaIds.length > 1;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFailed(false);
        onOpenChange(next);
      }}
      title={many ? t("titleMany", { count: mediaIds.length }) : t("title")}
      description={t("description")}
      confirmLabel={many ? t("confirmMany") : t("confirm")}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        const result = await deleteMedia({ mediaIds }).catch(() => null);
        if (!result?.ok) {
          setFailed(true);
          throw new Error("delete-failed");
        }
        onDeleted(result.data?.deleted ?? mediaIds.length);
      }}
    >
      {failed ? <InlineAlert tone="error" title={t("error")} /> : null}
    </ConfirmDialog>
  );
}
