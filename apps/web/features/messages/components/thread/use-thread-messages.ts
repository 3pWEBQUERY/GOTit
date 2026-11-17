"use client";

import { useMemo, useState } from "react";
import { loadOlderAction } from "../../actions/thread";
import { mergeMessages } from "../../lib/thread-state";
import type { ClientMessage, ClientThread } from "../../lib/types";

/**
 * Gespeicherte Nachrichten der Unterhaltung: die neueste Seite kommt bei jedem
 * Neuladen vom Server, ältere Seiten lädt «Ältere Nachrichten laden» dazu.
 */
export function useThreadMessages(thread: ClientThread) {
  const [older, setOlder] = useState<ClientMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const messages = useMemo(
    () => mergeMessages(older, thread.messages),
    [older, thread.messages],
  );
  const hasOlder = olderHasMore ?? thread.hasOlder;

  async function loadOlder(): Promise<boolean> {
    const first = messages[0];
    if (!first || loading) return false;
    setLoading(true);
    setLoadFailed(false);
    const result = await loadOlderAction(thread.conversationId, first.id).catch(
      () => null,
    );
    setLoading(false);
    if (!result) {
      setLoadFailed(true);
      return false;
    }
    setOlder((current) => mergeMessages(result.messages, current));
    setOlderHasMore(result.hasOlder);
    return true;
  }

  /** Eine gelöschte Nachricht auf einer älteren Seite sofort als gelöscht zeigen. */
  function markDeleted(messageId: string) {
    setOlder((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              deleted: true,
              body: null,
              attachments: [],
              status: null,
            }
          : message,
      ),
    );
  }

  return { messages, hasOlder, loadOlder, loading, loadFailed, markDeleted };
}
