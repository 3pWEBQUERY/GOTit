import { getStorage, resolveStorageConfig, verifyStorageToken } from "@app/storage";

/**
 * Die Routen unter `/api/storage` ersetzen beim Treiber fs die presigned URLs
 * eines Buckets. In der Produktion und beim Treiber s3 gibt es sie nicht (404).
 */
export function fsRoutesEnabled(): boolean {
  if (process.env.APP_ENV === "production") return false;
  try {
    return resolveStorageConfig().driver === "fs";
  } catch {
    return false;
  }
}

const notFound = () => new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

/** Liest den Körper mit harter Obergrenze, damit eine falsche Längenangabe nicht mehr Speicher belegt als erlaubt. */
async function readLimited(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** PUT mit kurzlebigem, signiertem Token: prüft Inhaltstyp und Länge wie ein Bucket mit signierter URL. */
export async function handleFsUpload(request: Request, token: string): Promise<Response> {
  if (!fsRoutesEnabled()) return notFound();
  const claims = verifyStorageToken(token, "upload", process.env.BETTER_AUTH_SECRET);
  if (!claims?.contentType || !claims.maxBytes) return new Response(null, { status: 403, headers: { "cache-control": "no-store" } });
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== claims.contentType) return new Response(null, { status: 415, headers: { "cache-control": "no-store" } });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > claims.maxBytes) return new Response(null, { status: 413, headers: { "cache-control": "no-store" } });
  const body = await readLimited(request, claims.maxBytes);
  if (!body) return new Response(null, { status: 413, headers: { "cache-control": "no-store" } });
  if (body.byteLength === 0) return new Response(null, { status: 400, headers: { "cache-control": "no-store" } });
  await getStorage().putObject({ bucket: claims.bucket, key: claims.key, body, contentType: claims.contentType });
  return new Response(null, { status: 200, headers: { "cache-control": "no-store" } });
}

/** GET mit kurzlebigem Token, wie eine presigned Download-URL: privat und ohne Cache. */
export async function handleFsDownload(token: string): Promise<Response> {
  if (!fsRoutesEnabled()) return notFound();
  const claims = verifyStorageToken(token, "download", process.env.BETTER_AUTH_SECRET);
  if (!claims) return notFound();
  const storage = getStorage();
  const [body, info] = await Promise.all([storage.getObject(claims), storage.headObject(claims)]);
  if (!body) return notFound();
  return new Response(Buffer.from(body), {
    headers: { "content-type": info?.contentType ?? "application/octet-stream", "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}
