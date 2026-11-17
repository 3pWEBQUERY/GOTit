/** Logische Buckets (PRD v2 14.3): Originale privat, Varianten für die Auslieferung. */
export const BUCKETS = ["originals", "derivatives"] as const;
export type BucketName = (typeof BUCKETS)[number];

export interface ObjectRef {
  bucket: BucketName;
  key: string;
}

export interface PresignUploadInput extends ObjectRef {
  contentType: string;
  /** Obergrenze der Datei in Bytes. Der Treiber s3 signiert die genaue Länge, fs prüft die Grenze in der Route. */
  maxBytes: number;
  /** Genaue Länge, die der Client angekündigt hat; s3 signiert sie als `Content-Length`. */
  contentLength?: number;
  /** Gültigkeit in Sekunden. */
  expiresIn: number;
}

/** Was der Browser für den direkten Upload braucht: eine URL für `PUT` und die Kopfzeilen, die er mitsenden muss. */
export interface PresignedUpload {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface PresignDownloadInput extends ObjectRef {
  expiresIn: number;
}

export interface PutObjectInput extends ObjectRef {
  body: Uint8Array;
  contentType: string;
}

export interface ObjectInfo {
  size: number;
  contentType: string | null;
}

/** Schnittstelle zum Objektspeicher; die Treiber s3 und fs setzen sie um. */
export interface ObjectStorage {
  readonly driver: "s3" | "fs";
  presignUpload(input: PresignUploadInput): Promise<PresignedUpload>;
  presignDownload(input: PresignDownloadInput): Promise<string>;
  /** Inhalt eines Objekts; null, wenn es nicht existiert. */
  getObject(ref: ObjectRef): Promise<Uint8Array | null>;
  /** Grösse und Typ ohne Inhalt; null, wenn es nicht existiert. */
  headObject(ref: ObjectRef): Promise<ObjectInfo | null>;
  putObject(input: PutObjectInput): Promise<void>;
  /** Löscht ein Objekt; ein fehlendes Objekt ist kein Fehler. */
  deleteObject(ref: ObjectRef): Promise<void>;
}
