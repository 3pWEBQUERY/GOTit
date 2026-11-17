import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_TYPES,
} from "@app/core/messaging/schemas";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

const MAX_INPUT_PIXELS = 100_000_000;
const MAX_EDGE = 1600;

export type ChatImageResult =
  | { ok: true; body: Uint8Array; width: number; height: number }
  | { ok: false; reason: "unsupported-type" | "too-large" | "unreadable" };

/**
 * Chat-Bild bereinigen (v1 FR-CHAT-001, Entscheid 0014): Typ am Inhalt prüfen,
 * nach EXIF drehen, auf höchstens 1600 px verkleinern und als WebP neu kodieren.
 * sharp übernimmt dabei keine Metadaten; EXIF und GPS sind danach weg.
 */
export async function processChatImage(
  input: Uint8Array,
): Promise<ChatImageResult> {
  if (input.byteLength > ATTACHMENT_MAX_BYTES)
    return { ok: false, reason: "too-large" };
  const detected = await fileTypeFromBuffer(input);
  if (
    !detected ||
    !(ATTACHMENT_TYPES as readonly string[]).includes(detected.mime)
  )
    return { ok: false, reason: "unsupported-type" };
  try {
    const { data, info } = await sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: "error",
    })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return {
      ok: true,
      body: new Uint8Array(data),
      width: info.width,
      height: info.height,
    };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}
