/**
 * Verbindung zum Echtzeit-Dienst (PRD v2 14.1, Entscheid 0014). Ereignisse
 * tragen nur die ID einer Unterhaltung; der Browser lädt Neues danach selbst.
 * Nach einem Abbruch verbindet sich der Client mit wachsender Pause neu und
 * holt dafür jedes Mal ein frisches Token, weil Tokens nach 60 Sekunden
 * ablaufen.
 */
export type RealtimeStatus = "connecting" | "open" | "closed";

export interface RealtimeEvent {
  type: "conversation";
  conversationId: string;
}

interface SocketLike {
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  close(): void;
}

export interface RealtimeOptions {
  url: string;
  fetchToken: () => Promise<string | null>;
  onEvent: (event: RealtimeEvent) => void;
  onStatus: (status: RealtimeStatus) => void;
  createSocket?: (url: string) => SocketLike;
  schedule?: (run: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
  random?: () => number;
}

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

/** Pause vor dem nächsten Versuch: verdoppelt sich bis 30 Sekunden, mit Streuung, damit nicht alle zugleich kommen. */
export function reconnectDelay(attempt: number, random = Math.random): number {
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return Math.round(ceiling * (0.5 + random() / 2));
}

/** Liest ein Ereignis; alles andere wird ignoriert. */
export function parseRealtimeEvent(data: unknown): RealtimeEvent | null {
  if (typeof data !== "string") return null;
  try {
    const value = JSON.parse(data) as Partial<RealtimeEvent>;
    return value.type === "conversation" &&
      typeof value.conversationId === "string"
      ? { type: "conversation", conversationId: value.conversationId }
      : null;
  } catch {
    return null;
  }
}

export function connectRealtime(options: RealtimeOptions): () => void {
  const createSocket =
    options.createSocket ??
    ((url: string) => new WebSocket(url) as unknown as SocketLike);
  const schedule =
    options.schedule ?? ((run: () => void, ms: number) => setTimeout(run, ms));
  const cancel =
    options.cancel ??
    ((handle: unknown) =>
      clearTimeout(handle as ReturnType<typeof setTimeout>));
  let attempt = 0;
  let stopped = false;
  let socket: SocketLike | null = null;
  let timer: unknown = null;

  function retry() {
    if (stopped) return;
    options.onStatus("closed");
    timer = schedule(open, reconnectDelay(attempt, options.random));
    attempt += 1;
  }

  async function open() {
    timer = null;
    if (stopped) return;
    options.onStatus("connecting");
    const token = await options.fetchToken().catch(() => null);
    if (stopped) return;
    if (!token) return retry();
    const separator = options.url.includes("?") ? "&" : "?";
    let current: SocketLike;
    try {
      current = createSocket(
        `${options.url}${separator}token=${encodeURIComponent(token)}`,
      );
    } catch {
      return retry();
    }
    socket = current;
    current.onopen = () => {
      attempt = 0;
      options.onStatus("open");
    };
    current.onmessage = (event) => {
      const parsed = parseRealtimeEvent(event.data);
      if (parsed) options.onEvent(parsed);
    };
    current.onerror = () => undefined;
    current.onclose = () => {
      if (socket !== current) return;
      socket = null;
      retry();
    };
  }

  void open();
  return () => {
    stopped = true;
    if (timer !== null) cancel(timer);
    const current = socket;
    socket = null;
    current?.close();
  };
}
