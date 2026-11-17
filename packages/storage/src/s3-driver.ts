import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, NoSuchKey, NotFound, PutObjectCommand, S3Client, S3ServiceException } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageConfig } from "./config";
import type { BucketName, ObjectStorage } from "./types";

type S3Config = Extract<StorageConfig, { driver: "s3" }>;

function isMissing(error: unknown): boolean {
  if (error instanceof NoSuchKey || error instanceof NotFound) return true;
  return error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404;
}

/**
 * Treiber für S3-kompatible Buckets (Railway). Jeder Bucket hat eigene
 * Zugangsdaten, deshalb ein Client pro Bucket. Uploads gehen direkt vom
 * Browser in den Bucket: Die URL signiert Inhaltstyp und genaue Länge.
 */
export function createS3Storage(config: S3Config): ObjectStorage {
  const clients = new Map<BucketName, S3Client>();
  function client(bucket: BucketName): S3Client {
    let found = clients.get(bucket);
    if (!found) {
      const credentials = config.buckets[bucket];
      found = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        forcePathStyle: config.forcePathStyle,
        credentials: { accessKeyId: credentials.accessKeyId, secretAccessKey: credentials.secretAccessKey },
      });
      clients.set(bucket, found);
    }
    return found;
  }
  const name = (bucket: BucketName) => config.buckets[bucket].name;

  return {
    driver: "s3",
    async presignUpload({ bucket, key, contentType, maxBytes, contentLength, expiresIn }) {
      const length = contentLength ?? maxBytes;
      if (length > maxBytes) throw new Error("Die angekündigte Länge überschreitet die Obergrenze.");
      const command = new PutObjectCommand({ Bucket: name(bucket), Key: key, ContentType: contentType, ContentLength: length });
      // Inhaltstyp und Länge sind Teil der Signatur: Ein anderer Typ oder eine andere Grösse scheitert am Bucket.
      const url = await getSignedUrl(client(bucket), command, { expiresIn, signableHeaders: new Set(["content-type", "content-length"]) });
      return { url, method: "PUT", headers: { "content-type": contentType } };
    },
    async presignDownload({ bucket, key, expiresIn }) {
      return getSignedUrl(client(bucket), new GetObjectCommand({ Bucket: name(bucket), Key: key }), { expiresIn });
    },
    async getObject({ bucket, key }) {
      try {
        const result = await client(bucket).send(new GetObjectCommand({ Bucket: name(bucket), Key: key }));
        return result.Body ? await result.Body.transformToByteArray() : null;
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async headObject({ bucket, key }) {
      try {
        const result = await client(bucket).send(new HeadObjectCommand({ Bucket: name(bucket), Key: key }));
        return { size: result.ContentLength ?? 0, contentType: result.ContentType ?? null };
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async putObject({ bucket, key, body, contentType }) {
      await client(bucket).send(new PutObjectCommand({ Bucket: name(bucket), Key: key, Body: body, ContentType: contentType }));
    },
    async deleteObject({ bucket, key }) {
      await client(bucket).send(new DeleteObjectCommand({ Bucket: name(bucket), Key: key }));
    },
  };
}
