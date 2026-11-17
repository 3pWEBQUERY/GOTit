import { abandonMediaUpload, confirmMediaUpload, requestMediaUpload } from "../actions/upload";
import { uploadContentType } from "./content-type";
import { putFile } from "./put-file";

export type UploadState = "queued" | "uploading" | "done" | "error";

export interface UploadEntry {
  id: string;
  name: string;
  size: number;
  state: UploadState;
  progress: number;
  /** Schlüssel unter `media.upload.errors`. */
  error?: string;
}

interface Job {
  entry: UploadEntry;
  file: File;
  visibility: "PUBLIC" | "MEMBERS";
}

const PARALLEL = 3;

/**
 * Uploads leben ausserhalb von React, auf Modulebene: Sie laufen weiter, wenn
 * die Seite im Studio wechselt, und die Bibliothek zeigt beim Zurückkehren
 * den Stand (PRD v2 11.3). Nur ein Neuladen des Browsers bricht sie ab.
 */
let jobs: Job[] = [];
let snapshot: readonly UploadEntry[] = [];
const listeners = new Set<() => void>();
const finishedListeners = new Set<() => void>();
let counter = 0;

function emit() {
  snapshot = jobs.map((job) => job.entry);
  for (const listener of listeners) listener();
}

function update(id: string, patch: Partial<UploadEntry>) {
  jobs = jobs.map((job) => (job.entry.id === id ? { ...job, entry: { ...job.entry, ...patch } } : job));
  emit();
}

async function run(job: Job): Promise<void> {
  const { id } = job.entry;
  const fail = (error: string) => update(id, { state: "error", error });
  const contentType = uploadContentType(job.file);
  if (!contentType) return fail("type");
  update(id, { state: "uploading", progress: 0, error: undefined });
  try {
    const ticket = await requestMediaUpload({ contentType, sizeBytes: job.file.size, rightsConfirmed: true, visibility: job.visibility });
    if (!ticket.ok || !ticket.data) return fail(ticket.ok ? "generic" : (ticket.formError ?? "generic"));
    const { mediaId, ...target } = ticket.data;
    const put = await putFile(job.file, target, (progress) => update(id, { progress }));
    if (put !== "ok") {
      void abandonMediaUpload({ mediaId }).catch(() => undefined);
      return fail(put === "network" ? "network" : "generic");
    }
    const confirmed = await confirmMediaUpload({ mediaId });
    if (!confirmed.ok) return fail(confirmed.formError ?? "generic");
    update(id, { state: "done", progress: 100 });
    for (const listener of finishedListeners) listener();
  } catch {
    fail("network");
  }
}

function pump() {
  const active = jobs.filter((job) => job.entry.state === "uploading").length;
  const next = jobs.filter((job) => job.entry.state === "queued").slice(0, Math.max(0, PARALLEL - active));
  for (const job of next) {
    update(job.entry.id, { state: "uploading" });
    void run(job).finally(pump);
  }
}

export const uploadStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): readonly UploadEntry[] {
    return snapshot;
  },
  /** Meldet, wenn ein Upload fertig ist, damit die Bibliothek neu lädt. */
  onFinished(listener: () => void): () => void {
    finishedListeners.add(listener);
    return () => finishedListeners.delete(listener);
  },
  add(files: readonly File[], visibility: "PUBLIC" | "MEMBERS"): void {
    for (const file of files) {
      counter += 1;
      jobs = [...jobs, { entry: { id: `upload-${counter}`, name: file.name, size: file.size, state: "queued", progress: 0 }, file, visibility }];
    }
    emit();
    pump();
  },
  /** Eine abgelehnte Datei (Typ, Grösse) erscheint mit Grund in der Liste; «Erneut versuchen» prüft sie noch einmal. */
  reject(file: File, error: string, visibility: "PUBLIC" | "MEMBERS"): void {
    counter += 1;
    jobs = [...jobs, { entry: { id: `upload-${counter}`, name: file.name, size: file.size, state: "error", progress: 0, error }, file, visibility }];
    emit();
  },
  retry(id: string): void {
    const job = jobs.find((entry) => entry.entry.id === id);
    if (!job || job.entry.state !== "error") return;
    update(id, { state: "queued", progress: 0, error: undefined });
    pump();
  },
  dismiss(id: string): void {
    jobs = jobs.filter((job) => job.entry.id !== id || job.entry.state === "uploading" || job.entry.state === "queued");
    emit();
  },
  busy(): boolean {
    return jobs.some((job) => job.entry.state === "uploading" || job.entry.state === "queued");
  },
};
