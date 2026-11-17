"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { markReadAction } from "../../actions/thread";
import { latestIncoming, newIncoming } from "../../lib/thread-state";
import type { ClientMessage } from "../../lib/types";

/**
 * Meldet «gelesen», sobald die Unterhaltung sichtbar ist und eine neue
 * Nachricht der Gegenseite da ist; danach zeigt die Liste sie als gelesen.
 */
export function useMarkRead(
  conversationId: string,
  messages: readonly ClientMessage[],
) {
  const router = useRouter();
  const marked = useRef<string | null>(null);
  const latest = latestIncoming(messages)?.id ?? null;
  useEffect(() => {
    function mark() {
      if (document.visibilityState !== "visible" || marked.current === latest)
        return;
      marked.current = latest;
      void markReadAction(conversationId)
        .then((ok) => (ok ? router.refresh() : undefined))
        .catch(() => {
          marked.current = null;
        });
    }
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [conversationId, latest, router]);
}

/**
 * Sagt neue Nachrichten der Gegenseite an (Live-Region, höflich). Nachgeladene
 * ältere Nachrichten und die eigenen werden nicht vorgelesen.
 */
export function useIncomingAnnouncement(
  messages: readonly ClientMessage[],
  describe: (message: ClientMessage) => string,
): string {
  const known = useRef<{ ids: Set<string>; newest: string } | null>(null);
  const [text, setText] = useState("");
  useEffect(() => {
    const newest = messages.at(-1)?.createdAt ?? "";
    const state = known.current;
    if (state === null) {
      known.current = {
        ids: new Set(messages.map((message) => message.id)),
        newest,
      };
      return;
    }
    // Nur, was nach dem bisher neuesten Stand kam; ältere Seiten bleiben still.
    const fresh = newIncoming(state.ids, messages).filter(
      (message) => message.createdAt > state.newest,
    );
    for (const message of messages) state.ids.add(message.id);
    if (newest > state.newest) state.newest = newest;
    if (fresh.length > 0) setText(fresh.slice(-3).map(describe).join(" "));
  }, [messages, describe]);
  return text;
}

/**
 * Hält den Verlauf unten: beim Öffnen, bei eigenen Nachrichten und bei neuen
 * Nachrichten, solange man unten ist. Beim Nachladen älterer Nachrichten
 * bleibt die Stelle stehen.
 */
export function useThreadScroll(
  lastKey: string | null,
  lastOwn: boolean,
  count: number,
) {
  const end = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const previousKey = useRef<string | null>(null);
  const anchor = useRef<{ element: Element; top: number } | null>(null);

  useEffect(() => {
    const target = end.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        atBottom.current = entry?.isIntersecting ?? true;
      },
      { rootMargin: "0px 0px 160px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const saved = anchor.current;
    if (saved) {
      anchor.current = null;
      const diff = saved.element.getBoundingClientRect().top - saved.top;
      const box = scroller.current;
      if (
        box &&
        box.scrollHeight > box.clientHeight &&
        getComputedStyle(box).overflowY !== "visible"
      )
        box.scrollTop += diff;
      else window.scrollBy(0, diff);
      return;
    }
    if (lastKey === previousKey.current) return;
    const first = previousKey.current === null;
    previousKey.current = lastKey;
    if (first || lastOwn || atBottom.current)
      end.current?.scrollIntoView({ block: "end" });
  }, [lastKey, lastOwn, count]);

  /** Vor dem Nachladen älterer Nachrichten: die oberste Nachricht merken. */
  function keepPosition() {
    const element =
      scroller.current?.querySelector("[role='log'] li:not(:first-child)") ??
      scroller.current?.querySelector("[role='log'] li");
    if (element)
      anchor.current = { element, top: element.getBoundingClientRect().top };
  }

  return { endRef: end, scrollerRef: scroller, keepPosition } satisfies {
    endRef: RefObject<HTMLDivElement | null>;
    scrollerRef: RefObject<HTMLDivElement | null>;
    keepPosition: () => void;
  };
}
