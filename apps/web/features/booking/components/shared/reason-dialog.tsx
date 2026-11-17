"use client";

import { REASON_MAX } from "@app/core/booking/schemas";
import { ConfirmDialog, TextArea } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type ReasonKind =
  | "cancel"
  | "cancelConfirmed"
  | "decline"
  | "cancelSafety"
  | "dispute";

export interface ReasonDialogProps {
  kind: ReasonKind | null;
  counterpartName: string;
  onOpenChange: (open: boolean) => void;
  /** Gibt `false` zurück, wenn die Aktion fehlschlug; der Dialog bleibt dann offen. */
  onConfirm: (reason: string) => Promise<boolean>;
  failure: string | null;
}

/**
 * Rückfrage vor einer endgültigen Aktion (PRD 13): Der Dialog nennt die
 * Folge; ein Grund ist freiwillig (v2 Abschnitt 3: absagen geht ohne
 * Begründung). Bei der Absage aus Sicherheitsgründen gibt es kein Feld: Die
 * Gegenseite sieht nur «Abgesagt», Einzelheiten gehören in die Meldung.
 */
export function ReasonDialog({
  kind,
  counterpartName,
  onOpenChange,
  onConfirm,
  failure,
}: ReasonDialogProps) {
  const t = useTranslations("booking.confirm");
  const [reason, setReason] = useState("");
  const shown = kind ?? "cancel";
  const withReason = shown !== "cancelSafety";

  return (
    <ConfirmDialog
      open={kind !== null}
      onOpenChange={(open) => {
        if (!open) setReason("");
        onOpenChange(open);
      }}
      title={t(`${shown}.title`)}
      description={t(`${shown}.description`, { name: counterpartName })}
      confirmLabel={t(`${shown}.confirm`)}
      cancelLabel={t(`${shown}.keep`)}
      onConfirm={async () => {
        const ok = await onConfirm(withReason ? reason.trim() : "");
        if (!ok) throw new Error("action-failed");
        setReason("");
      }}
    >
      <div className="flex flex-col gap-3">
        {withReason ? (
          <TextArea
            label={t("reason")}
            optionalLabel={t("optional")}
            hint={t("reasonHint", { name: counterpartName })}
            value={reason}
            maxLength={REASON_MAX}
            countLabel={(used, max) => t("count", { used, max })}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
          />
        ) : null}
        {failure ? (
          <p role="alert" className="text-small text-error">
            {failure}
          </p>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
