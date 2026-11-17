import { randomBytes } from "node:crypto";

/** Nicht erratbarer Schlüssel des Originals (192 Bit Zufall), ohne Bezug zu Konto oder Datei. */
export function newOriginalKey(): string {
  return `o/${randomBytes(24).toString("base64url")}`;
}

/** Schlüssel einer Variante im Bucket «derivatives»; der Zufallsteil ändert sich mit jeder Verarbeitung. */
export function newVariantPrefix(mediaId: string): string {
  return `m/${mediaId}/${randomBytes(12).toString("base64url")}`;
}
