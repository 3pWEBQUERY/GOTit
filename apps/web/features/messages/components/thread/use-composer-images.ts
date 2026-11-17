"use client";

import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_TYPES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@app/core/messaging/schemas";
import { useEffect, useRef, useState } from "react";
import { putFile } from "../../../media/upload/put-file";
import {
  confirmAttachmentAction,
  discardAttachmentAction,
  pendingAttachmentsAction,
  requestAttachmentAction,
} from "../../actions/attachments";
import type { OutboxImage } from "../../lib/thread-state";
import type { ClientPendingAttachment } from "../../lib/types";
import { attachmentSrc } from "./attachment-src";

export type ImageFailure =
  | "type"
  | "size"
  | "limit"
  | "network"
  | "processing"
  | "rate-limited"
  | "undeliverable";

export interface ComposerImage {
  key: string;
  attachmentId: string | null;
  state: "uploading" | "processing" | "ready" | "failed";
  progress: number;
  failure?: ImageFailure;
  /** Vorschau: lokal aus der Datei, nach einem Neuladen über die geschützte Route. */
  src: string | null;
  width: number | null;
  height: number | null;
}

const POLL_MS = 1500;
let counter = 0;

function fromServer(entry: ClientPendingAttachment): ComposerImage {
  const ready = entry.status === "READY";
  return {
    key: `server-${entry.id}`,
    attachmentId: entry.id,
    state: ready
      ? "ready"
      : entry.status === "PROCESSING"
        ? "processing"
        : "failed",
    progress: 100,
    failure:
      ready || entry.status === "PROCESSING"
        ? undefined
        : entry.status === "FAILED"
          ? "processing"
          : "network",
    src: ready ? attachmentSrc(entry.id) : null,
    width: entry.width,
    height: entry.height,
  };
}

/**
 * Bilder im Composer (Entscheid 0014): auswählen, hochladen mit Fortschritt,
 * Vorschau, entfernen. Gesendet wird ein Bild erst, wenn der Worker es ohne
 * EXIF und GPS neu gespeichert hat.
 */
export function useComposerImages(
  conversationId: string,
  initial: readonly ClientPendingAttachment[],
) {
  const [images, setImages] = useState<ComposerImage[]>(() =>
    initial.map(fromServer),
  );
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const update = (key: string, patch: Partial<ComposerImage>) =>
    setImages((current) =>
      current.map((image) =>
        image.key === key ? { ...image, ...patch } : image,
      ),
    );

  const processing = images.some((image) => image.state === "processing");
  useEffect(() => {
    if (!processing) return;
    const interval = setInterval(() => {
      void pendingAttachmentsAction(conversationId)
        .then((pending) =>
          setImages((current) =>
            current.map((image) => {
              const match = pending.find(
                (entry) => entry.id === image.attachmentId,
              );
              if (!match || image.state !== "processing") return image;
              if (match.status === "READY")
                return {
                  ...image,
                  state: "ready",
                  width: match.width,
                  height: match.height,
                  src: image.src ?? attachmentSrc(match.id),
                };
              if (match.status === "FAILED")
                return { ...image, state: "failed", failure: "processing" };
              return image;
            }),
          ),
        )
        .catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [processing, conversationId]);

  async function upload(key: string, file: File) {
    const ticket = await requestAttachmentAction(conversationId, {
      contentType: file.type,
      sizeBytes: file.size,
    }).catch(() => null);
    if (!ticket || !ticket.ok) {
      const reason = ticket?.reason;
      update(key, {
        state: "failed",
        failure:
          reason === "type" ||
          reason === "size" ||
          reason === "limit" ||
          reason === "rate-limited" ||
          reason === "undeliverable"
            ? reason
            : "network",
      });
      return;
    }
    update(key, { attachmentId: ticket.attachmentId });
    const put = await putFile(file, ticket, (progress) =>
      update(key, { progress }),
    );
    if (put !== "ok") {
      void discardAttachmentAction(ticket.attachmentId).catch(() => undefined);
      update(key, { state: "failed", failure: "network", attachmentId: null });
      return;
    }
    const confirmed = await confirmAttachmentAction(ticket.attachmentId).catch(
      () => false,
    );
    update(
      key,
      confirmed
        ? { state: "processing", progress: 100 }
        : { state: "failed", failure: "processing" },
    );
  }

  function add(files: readonly File[]) {
    let used = imagesRef.current.filter(
      (image) => image.state !== "failed",
    ).length;
    const added: ComposerImage[] = [];
    const jobs: [string, File][] = [];
    for (const file of files) {
      counter += 1;
      const key = `local-${counter}`;
      const base = {
        key,
        attachmentId: null,
        progress: 0,
        width: null,
        height: null,
      };
      const failure: ImageFailure | undefined = !(
        ATTACHMENT_TYPES as readonly string[]
      ).includes(file.type)
        ? "type"
        : file.size > ATTACHMENT_MAX_BYTES
          ? "size"
          : used >= MAX_ATTACHMENTS_PER_MESSAGE
            ? "limit"
            : undefined;
      if (failure) {
        added.push({ ...base, state: "failed", failure, src: null });
        continue;
      }
      used += 1;
      added.push({
        ...base,
        state: "uploading",
        src: URL.createObjectURL(file),
      });
      jobs.push([key, file]);
    }
    setImages((current) => [...current, ...added]);
    for (const [key, file] of jobs) void upload(key, file);
  }

  function remove(key: string) {
    const image = imagesRef.current.find((entry) => entry.key === key);
    if (!image) return;
    if (image.attachmentId)
      void discardAttachmentAction(image.attachmentId).catch(() => undefined);
    if (image.src?.startsWith("blob:")) URL.revokeObjectURL(image.src);
    setImages((current) => current.filter((entry) => entry.key !== key));
  }

  /** Fertige Bilder für eine Nachricht; sie verlassen den Composer. */
  function take(): OutboxImage[] {
    const ready = imagesRef.current.filter(
      (image): image is ComposerImage & { attachmentId: string } =>
        image.state === "ready" && image.attachmentId !== null,
    );
    setImages((current) =>
      current.filter((image) => !ready.includes(image as never)),
    );
    return ready.map((image) => ({
      id: image.attachmentId,
      src: image.src ?? attachmentSrc(image.attachmentId),
      width: image.width,
      height: image.height,
    }));
  }

  return {
    images,
    add,
    remove,
    take,
    busy: images.some(
      (image) => image.state === "uploading" || image.state === "processing",
    ),
    failed: images.some((image) => image.state === "failed"),
    ready: images.some((image) => image.state === "ready"),
  };
}
