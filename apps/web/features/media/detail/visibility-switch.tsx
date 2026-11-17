"use client";

import { Switch, type SwitchStatus } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeVisibility } from "../actions/arrange";

/** Sichtbarkeit als Schalter, speichert sofort mit Bestätigung am Ort (PRD 13). */
export function VisibilitySwitch({ mediaId, membersOnly }: { mediaId: string; membersOnly: boolean }) {
  const t = useTranslations("media.detail");
  const router = useRouter();
  const [checked, setChecked] = useState(membersOnly);
  const [status, setStatus] = useState<SwitchStatus>("idle");
  const labels: Record<SwitchStatus, string> = { idle: "", saving: t("saving"), saved: t("saved"), error: t("saveError") };

  async function change(next: boolean) {
    const previous = checked;
    setChecked(next);
    setStatus("saving");
    const result = await changeVisibility({ mediaIds: [mediaId], visibility: next ? "MEMBERS" : "PUBLIC" }).catch(() => ({ ok: false }));
    if (!result.ok) {
      setChecked(previous);
      setStatus("error");
      return;
    }
    setStatus("saved");
    router.refresh();
  }

  return <Switch label={t("membersOnly")} description={t("membersOnlyHint")} checked={checked} onCheckedChange={(next) => void change(next)} status={status} statusLabel={labels[status]} />;
}
