"use client";

import { Banner } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtime } from "./use-realtime";

/** Ohne Echtzeit fragt eine offene Ansicht in diesem Abstand nach. */
const POLL_MS = 20_000;
/** Mehrere Ereignisse kurz hintereinander laden nur einmal neu. */
const REFRESH_GAP_MS = 400;

/**
 * Hält Liste und Unterhaltung aktuell (PRD 13, Echtzeit): Ein Ereignis des
 * Echtzeit-Dienstes lädt die Ansicht ohne Neuladen der Seite. Fällt der
 * Dienst aus, fragt die Ansicht alle 20 Sekunden nach; ohne Netz erscheint
 * ein Banner, ungesendete Nachrichten bleiben stehen.
 */
export function MessengerLive({ url }: { url: string | null }) {
  const t = useTranslations("messages.live");
  const router = useRouter();
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(() => {
    if (timer.current) return;
    const wait = Math.max(0, last.current + REFRESH_GAP_MS - Date.now());
    timer.current = setTimeout(() => {
      timer.current = null;
      last.current = Date.now();
      router.refresh();
    }, wait);
  }, [router]);

  const status = useRealtime(url, refresh);

  useEffect(() => {
    if (status === "open") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [status, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onOnline = () => {
      setOffline(false);
      refresh();
    };
    const onOffline = () => setOffline(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  // Nach dem Verbinden einmal nachladen: Was während einer Unterbrechung kam, erscheint sofort.
  useEffect(() => {
    if (status === "open") refresh();
  }, [status, refresh]);

  return offline ? <Banner tone="warning">{t("offline")}</Banner> : null;
}
