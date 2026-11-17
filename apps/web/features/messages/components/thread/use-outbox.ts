"use client";

import { useRef, useState } from "react";
import { sendMessageAction } from "../../actions/thread";
import {
  settleOutbox,
  type OutboxEntry,
  type OutboxImage,
} from "../../lib/thread-state";

function newClientId(): string {
  return crypto.randomUUID();
}

/**
 * Ausgang der Unterhaltung (Entscheid 0014): Eine Nachricht erscheint sofort
 * mit «Wird gesendet». Scheitert sie, bleibt sie mit «Fehlgeschlagen» und
 * «Erneut senden» stehen; das erneute Senden nutzt dieselbe Kennung und
 * erzeugt deshalb keine zweite Nachricht.
 */
export function useOutbox(conversationId: string, onDelivered: () => void) {
  const [outbox, setOutbox] = useState<OutboxEntry[]>([]);
  const entries = useRef(new Map<string, OutboxEntry>());

  async function deliver(entry: OutboxEntry) {
    const result = await sendMessageAction(conversationId, {
      body: entry.body,
      clientId: entry.clientId,
      attachmentIds: entry.images.map((image) => image.id),
    }).catch(() => ({ ok: false as const, failure: "network" as const }));
    setOutbox((current) =>
      settleOutbox(
        current,
        entry.clientId,
        result.ok
          ? { ok: true, messageId: result.messageId }
          : { ok: false, failure: result.failure },
      ),
    );
    // Eingeschränkt: neu laden, damit statt des Composers der Hinweis steht.
    if (result.ok || result.failure === "restricted") onDelivered();
  }

  function send(body: string, images: OutboxImage[]) {
    const entry: OutboxEntry = {
      clientId: newClientId(),
      body,
      images,
      createdAt: new Date().toISOString(),
      state: "sending",
    };
    entries.current.set(entry.clientId, entry);
    setOutbox((current) => [...current, entry]);
    void deliver(entry);
  }

  function retry(clientId: string) {
    const entry = entries.current.get(clientId);
    if (!entry) return;
    setOutbox((current) =>
      current.map((item) =>
        item.clientId === clientId
          ? { ...item, state: "sending", failure: undefined }
          : item,
      ),
    );
    void deliver(entry);
  }

  return { outbox, send, retry };
}
