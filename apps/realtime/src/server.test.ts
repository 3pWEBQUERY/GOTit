import type { AddressInfo } from "node:net";
import { createRealtimeToken } from "@app/auth/realtime-token";
import { createLogger } from "@app/core/observability";
import { userChannel } from "@app/jobs/redis";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { allowedOriginsFromEnv, createRealtimeServer, type Subscriber } from "./server";

const secret = "r".repeat(32);

function fakeSubscriber() {
  let listener: ((pattern: string, channel: string, message: string) => void) | undefined;
  const subscriber: Subscriber = {
    psubscribe: async () => 1,
    on: (_event, next) => {
      listener = next;
    },
  };
  return { subscriber, publish: (channel: string, message: string) => listener?.("user:*", channel, message) };
}

const servers: Array<ReturnType<typeof createRealtimeServer>> = [];
async function start(allowedOrigins: string[] = []) {
  const fake = fakeSubscriber();
  const server = createRealtimeServer({ secret, subscriber: fake.subscriber, logger: createLogger("test"), allowedOrigins });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { ...fake, port: (server.address() as AddressInfo).port };
}
afterEach(() => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    server.close();
  }
});

describe("Echtzeit-Dienst", () => {
  it("meldet sich am Healthcheck gesund", async () => {
    const { port } = await start();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("weist Verbindungen ohne gültiges Token mit 401 ab", async () => {
    const { port } = await start();
    for (const query of ["", "?token=falsch", `?token=${createRealtimeToken("u1", "x".repeat(32))}`]) {
      const status = await new Promise<number>((resolve) => {
        const client = new WebSocket(`ws://127.0.0.1:${port}/${query}`);
        client.on("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
        client.on("open", () => resolve(101));
        client.on("error", () => undefined);
      });
      expect(status).toBe(401);
    }
  });

  it("weist fremde Herkünfte mit 403 ab, auch mit gültigem Token (Sicherheitsprüfung 1.14)", async () => {
    const { port } = await start(["https://thegnd.net"]);
    const status = (origin?: string) =>
      new Promise<number>((resolve) => {
        const client = new WebSocket(`ws://127.0.0.1:${port}/?token=${createRealtimeToken("anna", secret)}`, origin ? { origin } : {});
        client.on("unexpected-response", (_request, response) => resolve(response.statusCode ?? 0));
        client.on("open", () => {
          resolve(101);
          client.close();
        });
        client.on("error", () => undefined);
      });
    expect(await status("https://evil.example")).toBe(403);
    expect(await status("https://thegnd.net")).toBe(101);
    expect(await status()).toBe(101);
    expect(allowedOriginsFromEnv({ APP_URL: "https://thegnd.net/" })).toEqual(["https://thegnd.net"]);
    expect(allowedOriginsFromEnv({ REALTIME_ALLOWED_ORIGINS: "https://a.test, kaputt ,https://b.test", APP_URL: "https://c.test" })).toEqual(["https://a.test", "https://b.test"]);
    expect(allowedOriginsFromEnv({})).toEqual([]);
  });

  it("stellt Ereignisse nur dem Konto zu, an das sie gerichtet sind", async () => {
    const { port, publish } = await start();
    const connect = (userId: string) =>
      new Promise<{ received: string[]; client: WebSocket }>((resolve) => {
        const client = new WebSocket(`ws://127.0.0.1:${port}/?token=${createRealtimeToken(userId, secret)}`);
        const received: string[] = [];
        client.on("message", (data) => received.push(String(data)));
        client.on("open", () => resolve({ received, client }));
      });
    const anna = await connect("anna");
    const ben = await connect("ben");
    publish(userChannel("anna"), '{"type":"message.created"}');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(anna.received).toEqual(['{"type":"message.created"}']);
    expect(ben.received).toEqual([]);
    anna.client.close();
    ben.client.close();
  });
});
