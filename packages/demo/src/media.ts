import { randomBytes } from "node:crypto";
import { MEDIA_FORMATS, MEDIA_MAX_BYTES, MEDIA_WIDTHS } from "@app/core/media";
import type { MediaVisibility, PrismaClient } from "@app/db";
import { getStorage } from "@app/storage";
import { createProcessMediaJob } from "@app/worker/process-media";
import { demoImage } from "./images";

/**
 * Bilder der Demo-Daten durch die echte Medien-Pipeline (Entscheid 0011, 0023):
 * Original in den Bucket «originals» wie nach dem Upload, Status PROCESSING wie
 * nach der Bestätigung, dann dieselbe Verarbeitung wie im Worker (Prüfung,
 * Bereinigung, Varianten in «derivatives», IN_REVIEW). Die Moderation gibt sie
 * mit der Notiz «Demo» frei. Fertig verarbeitete Bilder bleiben bei einem
 * zweiten Lauf stehen; nur Reihenfolge, Titelbild und Texte werden nachgeführt.
 */
const VARIANT_COUNT = MEDIA_WIDTHS.length * MEDIA_FORMATS.length;
const processMedia = createProcessMediaJob(getStorage);

export type MediaOwner = { providerProfileId: string } | { organizationId: string };

export interface DemoMediaSpec {
  id: string;
  ownerUserId: string;
  owner: MediaOwner;
  /** Schlüssel für das abstrakte Bild; derselbe Schlüssel ergibt dasselbe Bild. */
  imageKey: string;
  shape: "portrait" | "square";
  sortOrder: number;
  visibility: MediaVisibility;
  isCover: boolean;
  isLogo: boolean;
}

export interface MediaOutcome {
  processed: number;
  kept: number;
  removed: number;
  /** Bilder, die wegen der Zeitgrenze erst beim nächsten Lauf entstehen. */
  pending: number;
}

async function deleteStored(db: PrismaClient, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const rows = await db.mediaAsset.findMany({ where: { id: { in: [...ids] } }, select: { originalKey: true, variants: { select: { key: true } } } });
  const storage = getStorage();
  for (const row of rows) {
    await storage.deleteObject({ bucket: "originals", key: row.originalKey });
    for (const variant of row.variants) await storage.deleteObject({ bucket: "derivatives", key: variant.key });
  }
  await db.mediaAsset.deleteMany({ where: { id: { in: [...ids] } } });
}

/** Objekte im Speicher und Zeilen aller Medien der genannten Konten löschen (für `--reset`). */
export async function deleteMediaOf(db: PrismaClient, ownerUserIds: readonly string[]): Promise<number> {
  const rows = await db.mediaAsset.findMany({ where: { ownerUserId: { in: [...ownerUserIds] } }, select: { id: true } });
  await deleteStored(
    db,
    rows.map((row) => row.id),
  );
  return rows.length;
}

async function createAndProcess(db: PrismaClient, spec: DemoMediaSpec, now: Date): Promise<void> {
  const image = await demoImage(spec.imageKey, spec.shape);
  const originalKey = `o/${randomBytes(24).toString("base64url")}`;
  const storage = getStorage();
  await storage.putObject({ bucket: "originals", key: originalKey, body: image.body, contentType: "image/jpeg" });
  const object = await storage.headObject({ bucket: "originals", key: originalKey });
  if (!object || object.size === 0 || object.size > MEDIA_MAX_BYTES) throw new Error(`Original für ${spec.id} fehlt oder ist zu gross.`);
  await db.mediaAsset.create({
    data: {
      id: spec.id,
      ownerUserId: spec.ownerUserId,
      ...spec.owner,
      status: "PROCESSING",
      visibility: spec.visibility,
      sortOrder: spec.sortOrder,
      isLogo: spec.isLogo,
      altText: image.altText,
      mimeType: "image/jpeg",
      sizeBytes: object.size,
      originalKey,
      rightsConfirmedAt: now,
    },
  });
  await processMedia({ mediaId: spec.id });
  const processed = await db.mediaAsset.findUniqueOrThrow({ where: { id: spec.id }, select: { status: true, failureReason: true } });
  if (processed.status !== "IN_REVIEW") throw new Error(`Medium ${spec.id} wurde nicht verarbeitet (${processed.status}, ${processed.failureReason ?? "ohne Grund"}).`);
  const { count } = await db.mediaAsset.updateMany({ where: { id: spec.id, status: "IN_REVIEW" }, data: { status: "PUBLISHED", moderationNote: "Demo" } });
  if (count !== 1) throw new Error(`Medium ${spec.id} liess sich nicht freigeben.`);
}

export interface MediaGroup {
  owner: MediaOwner;
  specs: readonly DemoMediaSpec[];
}

export interface SyncOptions {
  /** Gleichzeitig verarbeitete Bilder. */
  concurrency: number;
  /** Nach diesem Zeitpunkt beginnt keine neue Verarbeitung mehr; der Rest folgt beim nächsten Lauf. */
  deadline?: number;
}

/**
 * Bringt die Medien aller Eigentümer auf den Stand der Vorgaben: überzählige
 * Demo-Medien löschen, fertige behalten, fehlende oder unfertige verarbeiten.
 * Titelbilder zuerst, damit auch ein abgebrochener Lauf jedes Profil bebildert.
 * Ist die Zeit um, bleiben die übrigen Bilder für den nächsten Lauf offen.
 */
export async function syncMedia(db: PrismaClient, groups: readonly MediaGroup[], now: Date, options: SyncOptions): Promise<MediaOutcome> {
  const outcome: MediaOutcome = { processed: 0, kept: 0, removed: 0, pending: 0 };
  const todo: DemoMediaSpec[] = [];
  for (const group of groups) {
    const surplus = await db.mediaAsset.findMany({ where: { ...group.owner, id: { notIn: group.specs.map((spec) => spec.id) } }, select: { id: true } });
    await deleteStored(
      db,
      surplus.map((row) => row.id),
    );
    outcome.removed += surplus.length;
    for (const spec of group.specs) {
      const existing = await db.mediaAsset.findUnique({ where: { id: spec.id }, select: { status: true, deletedAt: true, _count: { select: { variants: true } } } });
      const ready = existing && existing.status === "PUBLISHED" && existing.deletedAt === null && existing._count.variants >= VARIANT_COUNT;
      if (ready) {
        outcome.kept += 1;
        continue;
      }
      if (existing) await deleteStored(db, [spec.id]);
      todo.push(spec);
    }
  }
  todo.sort((a, b) => a.sortOrder - b.sortOrder);
  let next = 0;
  const worker = async () => {
    while (next < todo.length && (options.deadline === undefined || Date.now() < options.deadline)) {
      const spec = todo[next] as DemoMediaSpec;
      next += 1;
      await createAndProcess(db, spec, now);
      outcome.processed += 1;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, options.concurrency) }, worker));
  outcome.pending = todo.length - next;

  // Der Alternativtext entsteht mit dem Bild und bleibt; nachgeführt werden Reihenfolge, Sichtbarkeit und Rollen.
  for (const spec of groups.flatMap((group) => group.specs)) {
    await db.mediaAsset.updateMany({
      where: { id: spec.id },
      data: { sortOrder: spec.sortOrder, visibility: spec.visibility, isLogo: spec.isLogo, isCover: spec.isCover, moderationNote: "Demo" },
    });
  }
  // Fehlt das vorgesehene Titelbild noch, wird wie in der App das erste vorhandene Bild Titelbild.
  for (const group of groups) {
    if (!("providerProfileId" in group.owner)) continue;
    const cover = await db.mediaAsset.count({ where: { ...group.owner, isCover: true } });
    if (cover > 0) continue;
    const first = await db.mediaAsset.findFirst({ where: group.owner, orderBy: { sortOrder: "asc" }, select: { id: true } });
    if (first) await db.mediaAsset.update({ where: { id: first.id }, data: { isCover: true } });
  }
  return outcome;
}
