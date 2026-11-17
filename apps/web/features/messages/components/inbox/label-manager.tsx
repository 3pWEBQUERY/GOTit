"use client";

import { LABEL_NAME_MAX, MAX_LABELS } from "@app/core/messaging/schemas";
import {
  Button,
  InlineAlert,
  SidePanel,
  SidePanelContent,
  SidePanelTrigger,
  TextField,
} from "@app/ui";
import { Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  createLabelAction,
  deleteLabelAction,
  renameLabelAction,
  type LabelActionResult,
} from "../../actions/labels";
import type { ClientLabel } from "../../lib/types";

type Failure = Extract<LabelActionResult, { ok: false }>["reason"] | "generic";

/** Ein Label: anzeigen, umbenennen oder nach Rückfrage am Ort löschen. */
function LabelRow({
  label,
  onChanged,
}: {
  label: ClientLabel;
  onChanged: () => void;
}) {
  const t = useTranslations("messages.labels");
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [name, setName] = useState(label.name);
  const [error, setError] = useState<Failure | null>(null);
  const [pending, setPending] = useState(false);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await renameLabelAction(label.id, name).catch(
      (): LabelActionResult => ({ ok: false, reason: "invalid" }),
    );
    setPending(false);
    if (!result.ok) return setError(result.reason);
    setError(null);
    setMode("view");
    onChanged();
  }

  async function remove() {
    setPending(true);
    const ok = await deleteLabelAction(label.id).catch(() => false);
    setPending(false);
    if (!ok) return setError("generic");
    onChanged();
  }

  if (mode === "rename")
    return (
      <li className="py-3">
        <form
          noValidate
          onSubmit={(event) => void rename(event)}
          className="flex flex-col gap-2"
        >
          <TextField
            label={t("nameLabel")}
            value={name}
            maxLength={LABEL_NAME_MAX}
            onChange={(event) => setName(event.currentTarget.value)}
            error={error ? t(`errors.${error}`) : undefined}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" loading={pending}>
              {t("saveName")}
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setMode("view");
                setName(label.name);
                setError(null);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      </li>
    );

  return (
    <li className="flex flex-col gap-2 py-3" data-label-row={label.name}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 break-words text-body text-ink">
          {label.name}
        </span>
        <Button
          variant="quiet"
          onClick={() => setMode("rename")}
          aria-label={t("renameNamed", { name: label.name })}
        >
          {t("rename")}
        </Button>
        <Button
          variant="quiet"
          onClick={() => setMode("delete")}
          aria-label={t("deleteNamed", { name: label.name })}
        >
          {t("delete")}
        </Button>
      </div>
      {mode === "delete" ? (
        <InlineAlert
          tone="warning"
          title={t("deleteTitle", { name: label.name })}
          action={
            <>
              <Button
                variant="destructive"
                loading={pending}
                onClick={() => void remove()}
              >
                {t("deleteConfirm")}
              </Button>
              <Button variant="quiet" onClick={() => setMode("view")}>
                {t("cancel")}
              </Button>
            </>
          }
        >
          {t("deleteText")}
        </InlineAlert>
      ) : null}
      {error ? (
        <p role="alert" className="text-small text-error">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </li>
  );
}

/**
 * «Labels verwalten» im Studio (v1 FR-CHAT-003): anlegen, umbenennen, löschen.
 * Löschen ist nicht umkehrbar und fragt am Ort nach, nicht in einem zweiten
 * Dialog (PRD 13).
 */
export function LabelManager({ labels }: { labels: readonly ClientLabel[] }) {
  const t = useTranslations("messages.labels");
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<Failure | null>(null);
  const [pending, setPending] = useState(false);
  const full = labels.length >= MAX_LABELS;

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await createLabelAction(name).catch(
      (): LabelActionResult => ({ ok: false, reason: "invalid" }),
    );
    setPending(false);
    if (!result.ok) return setError(result.reason);
    setError(null);
    setName("");
    router.refresh();
  }

  return (
    <SidePanel>
      <SidePanelTrigger asChild>
        <Button variant="quiet" icon={<Tags aria-hidden strokeWidth={1.5} />}>
          {t("manage")}
        </Button>
      </SidePanelTrigger>
      <SidePanelContent
        title={t("manageTitle")}
        description={t("manageDescription")}
        closeLabel={t("close")}
      >
        <div className="flex flex-col gap-6">
          <ul
            className="flex flex-col divide-y divide-border"
            aria-label={t("listLabel")}
          >
            {labels.map((label) => (
              <LabelRow
                key={`${label.id}-${label.name}`}
                label={label}
                onChanged={() => router.refresh()}
              />
            ))}
          </ul>
          {full ? (
            <InlineAlert tone="info" title={t("full", { max: MAX_LABELS })} />
          ) : (
            <form
              noValidate
              onSubmit={(event) => void create(event)}
              className="flex flex-col gap-2 border-t border-border pt-4"
            >
              <TextField
                label={t("newLabel")}
                hint={t("newHint", { max: LABEL_NAME_MAX })}
                value={name}
                maxLength={LABEL_NAME_MAX}
                onChange={(event) => setName(event.currentTarget.value)}
                error={error ? t(`errors.${error}`) : undefined}
              />
              <Button
                type="submit"
                variant="secondary"
                loading={pending}
                className="self-start"
              >
                {t("create")}
              </Button>
            </form>
          )}
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}
