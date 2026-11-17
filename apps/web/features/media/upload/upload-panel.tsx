"use client";

import { MEDIA_MAX_BYTES } from "@app/core/media/schemas";
import { Checkbox, FileDrop, InlineAlert, RadioGroup, type FileDropItemData, type FileRejectReason } from "@app/ui";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { uploadStore, type UploadEntry } from "./upload-store";
import { useUploads } from "./use-uploads";

const RIGHTS_ID = "medien-rechte";
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic";

export interface UploadPanelProps {
  /** Freie Plätze im Kontingent. */
  free: number;
  max: number;
  hasUploadedBefore: boolean;
  canUpload: boolean;
  /** Nach jedem fertigen Upload, damit die Bibliothek neu lädt. */
  onFinished: () => void;
  /** Organisation statt eigenem Profil: ohne Wahl der Sichtbarkeit, Medien sind öffentlich. */
  org?: string;
}

/**
 * Upload mit Pflicht-Bestätigung der Rechte (PRD v1 FR-MEDIA-002), Sichtbarkeit
 * für neue Fotos und Fortschritt pro Datei (PRD v2 11.3). Ohne Bestätigung
 * beginnt kein Upload; das Feld erklärt, was fehlt.
 */
export function UploadPanel({ free, max, hasUploadedBefore, canUpload, onFinished, org }: UploadPanelProps) {
  const t = useTranslations("media.upload");
  const format = useFormatter();
  const entries = useUploads(onFinished);
  const [rights, setRights] = useState(false);
  const [rightsError, setRightsError] = useState(false);
  const [visibility, setVisibility] = useState<"PUBLIC" | "MEMBERS">("PUBLIC");
  const errorText = useCallback((key: string | undefined) => (key && t.has(`errors.${key}`) ? t(`errors.${key}`) : t("errors.generic")), [t]);

  const items: FileDropItemData[] = entries.map((entry: UploadEntry) => ({
    id: entry.id,
    name: entry.name,
    sizeLabel: `${format.number(entry.size / 1024 / 1024, { maximumFractionDigits: 1 })} MB`,
    status: entry.state,
    progress: entry.progress,
    error: entry.state === "error" ? errorText(entry.error) : undefined,
  }));

  function requireRights(): boolean {
    if (rights) return true;
    setRightsError(true);
    requestAnimationFrame(() => document.getElementById(RIGHTS_ID)?.focus());
    return false;
  }

  if (!canUpload) return <InlineAlert tone="warning" title={t("notAllowed")} />;

  return (
    <section aria-labelledby="medien-upload-titel" className="flex min-w-0 flex-col gap-4" data-upload-panel>
      <h2 id="medien-upload-titel" className="text-h3">
        {t("title")}
      </h2>
      {hasUploadedBefore ? null : (
        <InlineAlert title={t("privacyTitle")} className="max-w-reading">
          {t("privacy")}
        </InlineAlert>
      )}
      <Checkbox
        id={RIGHTS_ID}
        label={t("rights")}
        description={t("rightsHint")}
        checked={rights}
        error={rightsError && !rights ? t("rightsMissing") : undefined}
        onCheckedChange={(checked) => {
          setRights(checked === true);
          if (checked === true) setRightsError(false);
        }}
        className="max-w-reading"
      />
      {org ? (
        <p className="max-w-reading text-small text-ink-muted">{t("organizationPublic")}</p>
      ) : (
        <RadioGroup
          label={t("visibility")}
          name="sichtbarkeit-neu"
          value={visibility}
          onValueChange={(value) => setVisibility(value === "MEMBERS" ? "MEMBERS" : "PUBLIC")}
          options={[
            { value: "PUBLIC", label: t("visibilityPublic"), description: t("visibilityPublicHint") },
            { value: "MEMBERS", label: t("visibilityMembers"), description: t("visibilityMembersHint") },
          ]}
        />
      )}
      {free <= 0 ? <InlineAlert tone="warning" title={t("quotaFull", { max })} /> : null}
      <FileDrop
        label={t("label")}
        dropHint={t("dropHint")}
        hint={`${t("hint", { free: Math.max(0, free) })} ${t("background")}`}
        accept={ACCEPT}
        multiple
        maxSizeBytes={MEDIA_MAX_BYTES}
        items={items}
        labels={{
          choose: t("choose"),
          queued: t("queued"),
          uploading: (percent) => t("uploading", { percent }),
          done: t("done"),
          retry: t("retry"),
          remove: (name) => t("remove", { name }),
        }}
        onFilesSelected={(files) => {
          if (requireRights()) uploadStore.add(files, org ? "PUBLIC" : visibility, org);
        }}
        onReject={(file, reason: FileRejectReason) => {
          if (requireRights()) uploadStore.reject(file, reason, org ? "PUBLIC" : visibility, org);
        }}
        onRetry={(id) => uploadStore.retry(id)}
        onRemove={(id) => uploadStore.dismiss(id)}
      />
    </section>
  );
}
