import { getSessionUserId } from "@app/auth";
import { exportOwnData, recordSecurityEvent } from "@app/core/account";
import { consumeRateLimit, rateLimitSubject } from "@app/core/rate-limit";

export const dynamic = "force-dynamic";

/** Export der eigenen Daten als JSON-Datei (PRD 7.5, Selbstbedienung). */
export async function GET(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const limit = await consumeRateLimit("dataExport", rateLimitSubject(userId));
  if (!limit.allowed) return Response.json({ error: "rate-limited" }, { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } });
  const data = await exportOwnData(userId);
  await recordSecurityEvent(userId, "DATA_EXPORTED", request.headers.get("user-agent"));
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="konto-export-${date}.json"`,
      "cache-control": "no-store",
    },
  });
}
