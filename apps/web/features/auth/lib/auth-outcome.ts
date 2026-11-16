/**
 * Ergebnis eines Aufrufs an Better Auth, so aufbereitet, wie die Formulare es
 * zeigen: Erfolg, abgewiesen (mit Status und Code), Rate Limit mit Wartezeit
 * oder keine Verbindung. Nie mehr Information, als die Oberfläche braucht.
 */
export type AuthOutcome<Data> =
  | { kind: "ok"; data: Data }
  | { kind: "rejected"; status: number; code: string | undefined }
  | { kind: "rateLimited"; retryAfterSeconds: number }
  | { kind: "network" };

interface AuthErrorLike {
  status: number;
  code?: string | undefined;
}

interface AuthResponseLike<Data> {
  data: Data | null;
  error: AuthErrorLike | null;
}

/** Fetch-Optionen, die Better Auth jedem Aufruf mitgibt; liest die Wartezeit aus der Antwort. */
export interface RetryAfterReader {
  onError: (context: { response: Response }) => void;
}

const DEFAULT_RETRY_SECONDS = 60;

export async function callAuth<Data>(run: (fetchOptions: RetryAfterReader) => Promise<AuthResponseLike<Data>>): Promise<AuthOutcome<Data>> {
  let retryAfter: number | null = null;
  const fetchOptions: RetryAfterReader = {
    onError: ({ response }) => {
      const header = Number(response.headers.get("X-Retry-After"));
      retryAfter = Number.isFinite(header) && header > 0 ? header : null;
    },
  };
  try {
    const { data, error } = await run(fetchOptions);
    if (!error) return { kind: "ok", data: data as Data };
    if (error.status === 429) return { kind: "rateLimited", retryAfterSeconds: retryAfter ?? DEFAULT_RETRY_SECONDS };
    if (!error.status) return { kind: "network" };
    return { kind: "rejected", status: error.status, code: error.code };
  } catch {
    return { kind: "network" };
  }
}
