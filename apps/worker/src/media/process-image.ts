import { MEDIA_CONTENT_TYPES, MEDIA_MAX_BYTES, type MediaContentType, type MediaFailureReason } from "@app/core/media/schemas";
import { MEDIA_FORMATS, MEDIA_WIDTHS, variantName, type MediaFormat } from "@app/core/media/variants";
import { fileTypeFromBuffer } from "file-type";
import sharp, { type OutputInfo, type Sharp } from "sharp";

/** Bilder mit mehr Pixeln lehnt sharp ab (Schutz vor Dekompressionsbomben), etwa 100 Megapixel. */
const MAX_INPUT_PIXELS = 100_000_000;

export interface ImageVariant {
  name: string;
  width: number;
  height: number;
  format: MediaFormat;
  body: Uint8Array;
}

export interface ProcessedImage {
  /** Typ anhand des Inhalts, nicht der Angabe des Clients. */
  detectedType: MediaContentType;
  width: number;
  height: number;
  dominantColor: string;
  /** Neu kodiertes Original ohne Metadaten, ersetzt das hochgeladene. */
  sanitized: { body: Uint8Array; contentType: string };
  variants: ImageVariant[];
}

export type ProcessImageResult = { ok: true; image: ProcessedImage } | { ok: false; reason: MediaFailureReason };

function hex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

function encode(pipeline: Sharp, format: MediaFormat): Sharp {
  return format === "avif" ? pipeline.avif({ quality: 55, effort: 4 }) : pipeline.webp({ quality: 80 });
}

function sanitize(pipeline: Sharp, type: MediaContentType): { pipeline: Sharp; contentType: string } {
  if (type === "image/png") return { pipeline: pipeline.png(), contentType: "image/png" };
  if (type === "image/webp") return { pipeline: pipeline.webp({ quality: 92 }), contentType: "image/webp" };
  return { pipeline: pipeline.jpeg({ quality: 92, mozjpeg: true }), contentType: "image/jpeg" };
}

/**
 * Prüft und verarbeitet ein hochgeladenes Bild (PRD v2 14.3, Schritt 2):
 * Typ anhand der Magic Bytes, dann mit sharp nach EXIF-Orientierung drehen und
 * neu kodieren. sharp übernimmt ohne `keepMetadata` keine Metadaten, also weder
 * EXIF noch GPS noch eingebettete Profile; die Neukodierung entfernt auch
 * angehängte Daten (Entscheid 0011). Varianten werden nie hochskaliert.
 */
export async function processImage(input: Uint8Array): Promise<ProcessImageResult> {
  if (input.byteLength > MEDIA_MAX_BYTES) return { ok: false, reason: "too-large" };
  const detected = await fileTypeFromBuffer(input);
  const type = detected?.mime as MediaContentType | undefined;
  if (!type || !(MEDIA_CONTENT_TYPES as readonly string[]).includes(type)) return { ok: false, reason: "unsupported-type" };

  const base = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();
  let width: number;
  let height: number;
  let prepared: { data: Buffer; info: OutputInfo };
  try {
    const metadata = await base.clone().metadata();
    const swap = (metadata.orientation ?? 1) >= 5;
    width = (swap ? metadata.height : metadata.width) ?? 0;
    height = (swap ? metadata.width : metadata.height) ?? 0;
    // Einmal dekodieren, drehen und auf die grösste Breite bringen; alle Varianten entstehen daraus.
    prepared = await base.clone().resize({ width: MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1], withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  } catch {
    // Die vorkompilierten sharp-Binärdateien dekodieren HEIC (HEVC) nicht, nur AVIF.
    return { ok: false, reason: type === "image/heic" ? "heic-unsupported" : "unreadable" };
  }
  if (width < 1 || height < 1) return { ok: false, reason: "unreadable" };
  const raw = { raw: { width: prepared.info.width, height: prepared.info.height, channels: prepared.info.channels } };

  try {
    const { dominant } = await sharp(prepared.data, raw).stats();
    const dominantColor = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;
    const variants: ImageVariant[] = [];
    for (const targetWidth of MEDIA_WIDTHS) {
      for (const format of MEDIA_FORMATS) {
        const { data, info } = await encode(sharp(prepared.data, raw).resize({ width: targetWidth, withoutEnlargement: true }), format).toBuffer({ resolveWithObject: true });
        variants.push({ name: variantName(targetWidth, format), width: info.width, height: info.height, format, body: new Uint8Array(data) });
      }
    }
    const clean = sanitize(base.clone(), type);
    const sanitizedBody = await clean.pipeline.toBuffer();
    return { ok: true, image: { detectedType: type, width, height, dominantColor, sanitized: { body: new Uint8Array(sanitizedBody), contentType: clean.contentType }, variants } };
  } catch {
    return { ok: false, reason: type === "image/heic" ? "heic-unsupported" : "unreadable" };
  }
}
