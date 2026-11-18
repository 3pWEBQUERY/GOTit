import { DEFAULT_LOCALE, LOCALES, type Locale } from "@app/core/locale";
import {
  clientIp,
  consumeRateLimit,
  rateLimitSubject,
} from "@app/core/rate-limit";
import { searchPort } from "@app/core/search";
import { isAgeConfirmed } from "@/features/age-gate/queries/is-age-confirmed";
import { createHref } from "@/features/shell/nav/href";
import { getViewer } from "@/features/shell/queries/get-viewer";
import { searchServerTiming, timed } from "@/features/search/timing";

export const dynamic = "force-dynamic";

/**
 * Vorschläge für das Suchfeld (PRD v1 FR-SEARCH-005): freigegebene Regionen und
 * Kategorien, Namen suchbarer Profile. Dieselben Regeln wie die Suche.
 */
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
  const params = new URL(request.url).searchParams;
  const requested = params.get("locale");
  const locale: Locale = LOCALES.includes(requested as Locale)
    ? (requested as Locale)
    : DEFAULT_LOCALE;
  const href = createHref(locale);
  const { value: suggestions, ms } = await timed(() =>
    searchPort.suggest(params.get("q") ?? "", { viewer, locale }),
  );
  return Response.json(
    {
      suggestions: suggestions.map((suggestion) =>
        suggestion.kind === "profile"
          ? {
              kind: "profile",
              slug: suggestion.slug,
              name: suggestion.name,
              href: href({
                pathname: "/p/[name]",
                params: { name: suggestion.slug },
              }),
            }
          : {
              kind: suggestion.kind,
              slug: suggestion.slug,
              name: suggestion.name,
            },
      ),
    },
    {
      headers: {
        "cache-control": "no-store",
        "server-timing": searchServerTiming(ms),
      },
    },
  );
}
