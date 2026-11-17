"use client";

import {
  ATTACHMENT_TYPES,
  MESSAGE_MAX_LENGTH,
} from "@app/core/messaging/schemas";
import { Button, Composer, IconButton } from "@app/ui";
import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  RestrictionNotice,
  type RestrictionInfo,
} from "../../../moderation/restriction-notice";
import type { OutboxImage } from "../../lib/thread-state";
import type { ClientPendingAttachment } from "../../lib/types";
import { ComposerImages } from "./composer-images";
import { useComposerImages } from "./use-composer-images";

export interface ThreadComposerProps {
  conversationId: string;
  counterpartName: string;
  pending: readonly ClientPendingAttachment[];
  blockedByMe: boolean;
  /** Eingeschränkt durch die Moderation: statt des Composers steht der Hinweis (v1 9.2). */
  restriction: RestrictionInfo | null;
  onUnblock: () => void;
  unblocking: boolean;
  onSend: (body: string, images: OutboxImage[]) => void;
}

/**
 * Composer der Unterhaltung, mobil aus Glas (PRD v2 6.4). Hat das Konto die
 * Gegenseite blockiert, steht statt des Composers der Hinweis mit «Blockierung
 * aufheben» (Entscheid 0014). Keine Vorlagenwahl in 1.8.
 */
export function ThreadComposer({
  conversationId,
  counterpartName,
  pending,
  blockedByMe,
  restriction,
  onUnblock,
  unblocking,
  onSend,
}: ThreadComposerProps) {
  const t = useTranslations("messages.composer");
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const images = useComposerImages(conversationId, pending);

  if (blockedByMe) {
    return (
      <div
        data-blocked-note
        className="flex flex-col gap-3 rounded-card border border-border bg-surface-2 p-4 max-md:fixed max-md:inset-x-3 max-md:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:z-40"
      >
        <p className="text-body text-ink">{t("blockedTitle")}</p>
        <p className="text-small text-ink-muted">
          {t("blockedText", { name: counterpartName })}
        </p>
        <Button
          variant="secondary"
          loading={unblocking}
          onClick={onUnblock}
          className="self-start"
        >
          {t("unblock")}
        </Button>
      </div>
    );
  }

  if (restriction) {
    return (
      <RestrictionNotice
        kind="MESSAGING"
        restriction={restriction}
        className="max-md:fixed max-md:inset-x-3 max-md:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:z-40"
      />
    );
  }

  function send() {
    const body = text.trim();
    if (body.length > MESSAGE_MAX_LENGTH)
      return setProblem(t("tooLong", { max: MESSAGE_MAX_LENGTH }));
    if (images.busy) return setProblem(t("imagesBusy"));
    if (images.failed) return setProblem(t("imagesFailed"));
    if (body.length === 0 && !images.ready) return;
    setProblem(null);
    onSend(body, images.take());
    setText("");
  }

  return (
    <Composer
      glass
      value={text}
      onValueChange={(value) => {
        setText(value);
        if (problem) setProblem(null);
      }}
      onSend={send}
      allowEmpty={images.ready}
      label={t("label", { name: counterpartName })}
      placeholder={t("placeholder")}
      sendLabel={t("send")}
      hint={<span className="max-md:sr-only">{t("hint")}</span>}
      leading={
        <>
          <input
            ref={picker}
            type="file"
            accept={ATTACHMENT_TYPES.join(",")}
            multiple
            hidden
            data-image-input
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              if (files.length > 0) {
                setProblem(null);
                images.add(files);
              }
            }}
          />
          <IconButton
            label={t("attach")}
            icon={<ImagePlus strokeWidth={1.5} />}
            onClick={() => picker.current?.click()}
          />
        </>
      }
      attachments={
        images.images.length > 0 || problem ? (
          <>
            <ComposerImages images={images.images} onRemove={images.remove} />
            {problem ? (
              <p role="alert" className="px-1 pb-2 text-small text-error">
                {problem}
              </p>
            ) : null}
          </>
        ) : null
      }
      className="md:border-t md:border-border md:pt-3"
    />
  );
}
