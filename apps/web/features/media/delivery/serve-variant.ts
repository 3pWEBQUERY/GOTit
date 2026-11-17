import type { MediaDelivery } from "@app/core/media";
import { getStorage } from "@app/storage";

/** Gültigkeit der Weiterleitung auf geschützte Varianten, in Sekunden. */
const PRIVATE_URL_TTL_SECONDS = 60;

const NO_STORE = { "cache-control": "private, no-store" };

/** 404 ohne Hinweis, ob es das Medium gibt (PRD 16.2). */
export function mediaNotFound(): Response {
  return new Response(null, { status: 404, headers: NO_STORE });
}

/**
 * Antwort für eine Variante (Entscheid 0011): Öffentliche, freigegebene
 * Varianten liefert `web` selbst mit langem Cache aus, damit Browser und CDN
 * sie behalten dürfen; eine presigned URL liefe vor Ablauf des Caches ab.
 * Alles andere leitet auf eine kurzlebige signierte URL um, ohne Cache.
 */
export async function serveVariant(delivery: MediaDelivery): Promise<Response> {
  if (!delivery) return mediaNotFound();
  const storage = getStorage();
  const ref = { bucket: "derivatives", key: delivery.key } as const;
  if (delivery.access === "public") {
    const body = await storage.getObject(ref);
    if (!body) return mediaNotFound();
    return new Response(Buffer.from(body), {
      headers: { "content-type": `image/${delivery.format}`, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
    });
  }
  const location = await storage.presignDownload({ ...ref, expiresIn: PRIVATE_URL_TTL_SECONDS });
  return new Response(null, { status: 302, headers: { ...NO_STORE, location } });
}
