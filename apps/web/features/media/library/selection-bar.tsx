"use client";

import { Button, useToast } from "@app/ui";
import { Globe, Lock, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { changeVisibility } from "../actions/arrange";

/** Sammelaktionen für die Auswahl (PRD 13: Mehrfachauswahl mit Sammelaktionen). */
export function SelectionBar({ selected, onClear, onDelete, onChanged }: { selected: readonly string[]; onClear: () => void; onDelete: () => void; onChanged: () => void }) {
  const t = useTranslations("media.selection");
  const { toast } = useToast();
  const [pending, setPending] = useState<"PUBLIC" | "MEMBERS" | null>(null);
  if (selected.length === 0) return null;

  async function visibility(value: "PUBLIC" | "MEMBERS") {
    setPending(value);
    const result = await changeVisibility({ mediaIds: selected, visibility: value }).catch(() => ({ ok: false }));
    setPending(null);
    toast(result.ok ? { title: t("updated"), tone: "success" } : { title: t("error"), tone: "error" });
    if (result.ok) onChanged();
  }

  return (
    <div role="region" aria-label={t("label")} className="flex flex-wrap items-center gap-2 border-y border-border py-2" data-selection-bar>
      <p className="tabular mr-auto text-small text-ink" aria-live="polite">
        {t("count", { count: selected.length })}
      </p>
      <Button variant="secondary" icon={<Lock aria-hidden strokeWidth={1.5} />} loading={pending === "MEMBERS"} onClick={() => void visibility("MEMBERS")}>
        {t("makeMembers")}
      </Button>
      <Button variant="secondary" icon={<Globe aria-hidden strokeWidth={1.5} />} loading={pending === "PUBLIC"} onClick={() => void visibility("PUBLIC")}>
        {t("makePublic")}
      </Button>
      <Button variant="secondary" icon={<Trash2 aria-hidden strokeWidth={1.5} />} onClick={onDelete}>
        {t("delete")}
      </Button>
      <Button variant="quiet" icon={<X aria-hidden strokeWidth={1.5} />} onClick={onClear}>
        {t("clear")}
      </Button>
    </div>
  );
}
