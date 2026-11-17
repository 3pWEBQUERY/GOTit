import {
  INBOX_VIEWS,
  SEARCH_MAX_LENGTH,
  type InboxView,
} from "@app/core/messaging/schemas";

/**
 * Ansicht, Suche und Label des Postfachs stehen in der URL (PRD 13, Tabs).
 * Die Namen der Parameter sind deutsch wie `?weiter=` und `?bearbeiten=`.
 */
export const VIEW_PARAM = "ansicht";
export const QUERY_PARAM = "q";
export const LABEL_PARAM = "label";

export interface InboxParams {
  view: InboxView;
  q: string;
  labelId: string | null;
}

type Search = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : (value?.[0] ?? "");
}

export function parseInboxParams(search: Search): InboxParams {
  const view = single(search[VIEW_PARAM]);
  const label = single(search[LABEL_PARAM]).trim();
  return {
    view: (INBOX_VIEWS as readonly string[]).includes(view)
      ? (view as InboxView)
      : "alle",
    q: single(search[QUERY_PARAM])
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, SEARCH_MAX_LENGTH),
    labelId: /^[A-Za-z0-9_-]{1,64}$/.test(label) ? label : null,
  };
}

/** Query für Links: Standardwerte fallen weg, damit «Alle» ohne Parameter auskommt. */
export function inboxQuery(params: InboxParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.view !== "alle") query[VIEW_PARAM] = params.view;
  if (params.q) query[QUERY_PARAM] = params.q;
  if (params.labelId) query[LABEL_PARAM] = params.labelId;
  return query;
}
