import { DEFAULT_LOCALE } from "@app/core/locale";
import {
  clientIp,
  consumeRateLimit,
  rateLimitSubject,
} from "@app/core/rate-limit";
import { searchPort } from "@app/core/search";
import { parseSearchQuery } from "@app/core/search/query";
import { isAgeConfirmed } from "@/features/age-gate/queries/is-age-confirmed";
import { getViewer } from "@/features/shell/queries/get-viewer";
import { searchParamsRecord } from "@/features/search/raw-params";
import { searchServerTiming, timed } from "@/features/search/timing";

export const dynamic = "force-dynamic";

/** Trefferzahl für den Button im Filter-Sheet (PRD v2 9.2). Rate-limitiert pro Client-Adresse. */
export async function GET(request: Request) {
  const limit = await consumeRateLimit(
    "searchSuggest",
    rateLimitSubject(clientIp(request.headers)),
  );
  if (!limit.allowed)
    return Response.json(
      { error: "rate-limited" },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  const viewer = await getViewer();
  if (!(await isAgeConfirmed(viewer)))
    return Response.json({ error: "age-gate" }, { status: 403 });
  const query = parseSearchQuery(
    searchParamsRecord(new URL(request.url).searchParams),
  );
  const { value: total, ms } = await timed(() =>
    searchPort.count(query, { viewer, locale: DEFAULT_LOCALE }),
  );
  return Response.json(
    { total },
    {
      headers: {
        "cache-control": "no-store",
        "server-timing": searchServerTiming(ms),
      },
    },
  );
}
