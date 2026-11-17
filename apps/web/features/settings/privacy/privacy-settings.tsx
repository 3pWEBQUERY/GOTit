"use client";

import { RadioGroup, Switch } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SaveStatus } from "../components/save-status";
import { useInstantSave, usePreferenceSwitch } from "../hooks/use-instant-save";

type Visibility = "MEMBERS" | "NOBODY";

export interface PrivacySettingsProps {
  profileVisibility: Visibility;
  showOnlineStatus: boolean;
  readReceipts: boolean;
}

/** Sichtbarkeit, Online-Status und Lesebestätigung. Alles speichert sofort und bestätigt am Ort; «Blockiert» steht als eigener Teil darunter. */
export function PrivacySettings(initial: PrivacySettingsProps) {
  const t = useTranslations("settings.privacy");
  const [visibility, setVisibility] = useState<Visibility>(initial.profileVisibility);
  const visibilitySave = useInstantSave();
  const online = usePreferenceSwitch(initial.showOnlineStatus, (showOnlineStatus) => ({ showOnlineStatus }));
  const receipts = usePreferenceSwitch(initial.readReceipts, (readReceipts) => ({ readReceipts }));

  async function changeVisibility(next: string) {
    if (next !== "MEMBERS" && next !== "NOBODY") return;
    const previous = visibility;
    setVisibility(next);
    if (!(await visibilitySave.save({ profileVisibility: next }))) setVisibility(previous);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <RadioGroup
          label={t("visibility")}
          value={visibility}
          onValueChange={(next) => void changeVisibility(next)}
          options={[
            { value: "MEMBERS", label: t("visibilityMembers") },
            { value: "NOBODY", label: t("visibilityNobody"), description: t("visibilityNobodyHint") },
          ]}
        />
        <SaveStatus status={visibilitySave.status} label={visibilitySave.statusLabel} />
      </div>
      <div className="flex flex-col divide-y divide-border border-y border-border">
        <Switch label={t("onlineStatus")} description={t("onlineStatusHint")} {...online} />
        <Switch label={t("readReceipts")} description={t("readReceiptsHint")} {...receipts} />
      </div>
    </div>
  );
}
