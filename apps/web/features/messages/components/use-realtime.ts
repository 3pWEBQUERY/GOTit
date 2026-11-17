"use client";

import { useEffect, useRef, useState } from "react";
import {
  connectRealtime,
  type RealtimeEvent,
  type RealtimeStatus,
} from "../lib/realtime-client";

async function fetchToken(): Promise<string | null> {
  const response = await fetch("/api/realtime/token", {
    method: "POST",
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { token?: string };
  return body.token ?? null;
}

/**
 * Verbindung zum Echtzeit-Dienst, solange die Komponente steht. Ohne URL
 * (Dienst nicht eingerichtet) bleibt der Status «closed»; die Ansicht fragt
 * dann selbst in Abständen nach (Entscheid 0014).
 */
export function useRealtime(
  url: string | null,
  onEvent: (event: RealtimeEvent) => void,
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>(
    url ? "connecting" : "closed",
  );
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    if (!url) return;
    return connectRealtime({
      url,
      fetchToken,
      onEvent: (event) => handler.current(event),
      onStatus: setStatus,
    });
  }, [url]);
  return status;
}
