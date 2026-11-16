import { createServer, type Server } from "node:http";
import { verifyRealtimeToken } from "@app/auth/realtime-token";
import type { Logger } from "@app/core/observability";
import { USER_CHANNEL_PREFIX } from "@app/jobs/redis";
import { WebSocketServer, type WebSocket } from "ws";

/** Der Teil eines Redis-Abonnenten, den der Dienst braucht. */
export interface Subscriber {
  psubscribe(pattern: string): Promise<unknown>;
  on(event: "pmessage", listener: (pattern: string, channel: string, message: string) => void): unknown;
}

export interface RealtimeOptions {
  secret: string | undefined;
  subscriber: Subscriber;
  logger: Logger;
}

const PING_INTERVAL_MS = 30_000;

/**
 * WebSocket-Dienst: nimmt nur Verbindungen mit gültigem, kurzlebigem Token an
 * und reicht Ereignisse aus dem Redis-Kanal des Kontos durch. Er liest keine
 * Inhalte und protokolliert keine Payloads.
 */
export function createRealtimeServer({ secret, subscriber, logger }: RealtimeOptions): Server {
  const socketsByUser = new Map<string, Set<WebSocket>>();
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 });

  const server = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" }).end('{"status":"ok"}');
      return;
    }
    response.writeHead(404).end();
  });

  server.on("upgrade", (request, socket, head) => {
    const token = new URL(request.url ?? "/", "http://localhost").searchParams.get("token");
    const userId = verifyRealtimeToken(token, secret);
    if (!userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(request, socket, head, (client) => {
      const set = socketsByUser.get(userId) ?? new Set<WebSocket>();
      set.add(client);
      socketsByUser.set(userId, set);
      client.on("close", () => {
        set.delete(client);
        if (set.size === 0) socketsByUser.delete(userId);
      });
    });
  });

  void subscriber.psubscribe(`${USER_CHANNEL_PREFIX}*`).catch(() => logger.error("redis_subscribe_failed"));
  subscriber.on("pmessage", (_pattern, channel, message) => {
    const targets = socketsByUser.get(channel.slice(USER_CHANNEL_PREFIX.length));
    if (!targets) return;
    for (const client of targets) client.send(message);
  });

  const ping = setInterval(() => {
    for (const client of sockets.clients) client.ping();
  }, PING_INTERVAL_MS);
  server.on("close", () => clearInterval(ping));

  return server;
}
