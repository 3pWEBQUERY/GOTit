"use client";

import { useEffect, useSyncExternalStore } from "react";
import { uploadStore, type UploadEntry } from "./upload-store";

const EMPTY: readonly UploadEntry[] = [];

/** Liste der Uploads; warnt beim Verlassen der Seite, solange noch etwas hochlädt. */
export function useUploads(onFinished: () => void): readonly UploadEntry[] {
  const entries = useSyncExternalStore(uploadStore.subscribe, uploadStore.getSnapshot, () => EMPTY);
  useEffect(() => uploadStore.onFinished(onFinished), [onFinished]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (uploadStore.busy()) event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  return entries;
}
