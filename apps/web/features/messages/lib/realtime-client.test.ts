import { describe, expect, it } from "vitest";
import {
  connectRealtime,
  parseRealtimeEvent,
  reconnectDelay,
  type RealtimeStatus,
} from "./realtime-client";

class FakeSocket {
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  closed = false;
  constructor(public url: string) {}
  close() {
    this.closed = true;
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Echtzeit im Browser", () => {
  it("wartet nach Abbrüchen länger, höchstens 30 Sekunden", () => {
    expect(reconnectDelay(0, () => 1)).toBe(1000);
    expect(reconnectDelay(3, () => 1)).toBe(8000);
    expect(reconnectDelay(10, () => 1)).toBe(30_000);
    expect(reconnectDelay(10, () => 0)).toBe(15_000);
  });

  it("liest nur Ereignisse zu Unterhaltungen", () => {
    expect(
      parseRealtimeEvent('{"type":"conversation","conversationId":"c1"}'),
    ).toEqual({
      type: "conversation",
      conversationId: "c1",
    });
    expect(parseRealtimeEvent('{"type":"other"}')).toBeNull();
    expect(parseRealtimeEvent("kein json")).toBeNull();
  });

  it("holt bei jedem Neuverbinden ein frisches Token und meldet Ereignisse", async () => {
    const sockets: FakeSocket[] = [];
    const scheduled: (() => void)[] = [];
    const statuses: RealtimeStatus[] = [];
    const events: string[] = [];
    let tokens = 0;
    const stop = connectRealtime({
      url: "ws://realtime.test",
      fetchToken: async () => `t${(tokens += 1)}`,
      onEvent: (event) => events.push(event.conversationId),
      onStatus: (status) => statuses.push(status),
      createSocket: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
      schedule: (run) => scheduled.push(run),
      cancel: () => undefined,
      random: () => 1,
    });
    await tick();
    expect(sockets[0]?.url).toBe("ws://realtime.test?token=t1");
    sockets[0]?.onopen?.({});
    sockets[0]?.onmessage?.({
      data: '{"type":"conversation","conversationId":"c7"}',
    });
    expect(events).toEqual(["c7"]);
    sockets[0]?.onclose?.({});
    expect(statuses.at(-1)).toBe("closed");
    scheduled.shift()?.();
    await tick();
    expect(sockets[1]?.url).toBe("ws://realtime.test?token=t2");
    stop();
    expect(sockets[1]?.closed).toBe(true);
  });

  it("versucht es ohne Token später erneut, statt ohne Token zu verbinden", async () => {
    const scheduled: (() => void)[] = [];
    const sockets: FakeSocket[] = [];
    const stop = connectRealtime({
      url: "ws://realtime.test",
      fetchToken: async () => null,
      onEvent: () => undefined,
      onStatus: () => undefined,
      createSocket: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
      schedule: (run) => scheduled.push(run),
      cancel: () => undefined,
    });
    await tick();
    expect(sockets).toHaveLength(0);
    expect(scheduled).toHaveLength(1);
    stop();
  });
});
