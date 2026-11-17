/**
 * Herkünfte, auf die presigned URLs des Treibers s3 zeigen, für die Content
 * Security Policy (`connect-src` für den Upload, `img-src` für Weiterleitungen).
 * Ohne Abhängigkeiten, damit `proxy.ts` es laden kann. Beim Treiber fs bleibt
 * alles auf der eigenen Herkunft; die Liste ist dann leer.
 */
export function storageOrigins(env: Record<string, string | undefined> = process.env): string[] {
  if (env.STORAGE_DRIVER?.trim() !== "s3" || !env.S3_ENDPOINT) return [];
  let endpoint: URL;
  try {
    endpoint = new URL(env.S3_ENDPOINT);
  } catch {
    return [];
  }
  const pathStyle = env.S3_FORCE_PATH_STYLE === "1" || env.S3_FORCE_PATH_STYLE === "true";
  if (pathStyle) return [endpoint.origin];
  // Virtual-hosted style: Der Bucket steht vor dem Host des Endpunkts.
  const buckets = [env.S3_ORIGINALS_BUCKET, env.S3_DERIVATIVES_BUCKET].filter((name): name is string => Boolean(name?.trim()));
  return [...new Set(buckets.map((name) => `${endpoint.protocol}//${name.trim()}.${endpoint.host}`))];
}
