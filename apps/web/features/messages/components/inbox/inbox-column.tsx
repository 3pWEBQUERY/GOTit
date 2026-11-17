import type { Locale } from "@app/core/locale";
import { INBOX_VIEWS } from "@app/core/messaging/schemas";
import {
  ConversationList,
  EmptyState,
  UiLink,
  buttonVariants,
  cn,
} from "@app/ui";
import { MessageSquare, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  inboxQuery,
  type InboxParams,
  VIEW_PARAM,
  LABEL_PARAM,
} from "../../lib/inbox-params";
import type { MessengerArea } from "../../lib/types";
import type { InboxData } from "../../queries/load-inbox";
import { InboxSearch } from "./inbox-search";
import { InboxTabs } from "./inbox-tabs";
import { LabelFilter } from "./label-filter";
import { LabelManager } from "./label-manager";

export interface InboxColumnProps {
  locale: Locale;
  area: MessengerArea;
  params: InboxParams;
  data: InboxData;
  /** Liste ohne Thread, zum Beispiel `/nachrichten`. */
  listPath: string;
  /** Wohin Suche und Filter führen: die aktuelle Seite, damit eine offene Unterhaltung offen bleibt. */
  currentPath: string;
  discoverHref: string;
  className?: string;
}

/**
 * Linke Spalte (PRD v2 11.4): Ansichten, Suche in eigenen Chats, im Studio der
 * Filter nach Label, dann die Unterhaltungen. «Keine Treffer» unterscheidet
 * sich von «noch nichts da» (PRD 13).
 */
export async function InboxColumn({
  locale,
  area,
  params,
  data,
  listPath,
  currentPath,
  discoverHref,
  className,
}: InboxColumnProps) {
  const t = await getTranslations({ locale, namespace: "messages" });
  const at = (next: Partial<InboxParams>) => {
    const query = new URLSearchParams(
      inboxQuery({ ...params, ...next }),
    ).toString();
    return query ? `${currentPath}?${query}` : currentPath;
  };
  const tabs = INBOX_VIEWS.map((view) => ({
    view,
    label: t(`tabs.${view}`),
    href: at({ view }),
    current: params.view === view,
  }));
  const hidden: Record<string, string> = {};
  if (params.view !== "alle") hidden[VIEW_PARAM] = params.view;
  if (params.labelId) hidden[LABEL_PARAM] = params.labelId;
  const filtered = Boolean(params.q || params.labelId);
  const labelHrefs = Object.fromEntries([
    ["alle", at({ labelId: null })],
    ...data.labels.map((label) => [label.id, at({ labelId: label.id })]),
  ]);

  return (
    <section
      aria-labelledby="nachrichten-liste"
      className={cn("flex min-w-0 flex-col gap-3 md:min-h-0", className)}
      data-inbox
    >
      <h2 id="nachrichten-liste" className="sr-only">
        {t("list.title")}
      </h2>
      <InboxTabs label={t("tabs.label")} tabs={tabs} />
      <InboxSearch
        action={currentPath}
        value={params.q}
        hidden={hidden}
        labels={{
          field: t("search.label"),
          clear: t("search.clear"),
          hint: t("search.hint"),
        }}
      />
      {area === "studio" ? (
        <div className="flex flex-col gap-1">
          <LabelFilter
            labels={data.labels}
            current={params.labelId}
            hrefFor={labelHrefs}
          />
          <div className="self-start">
            <LabelManager labels={data.labels} />
          </div>
        </div>
      ) : null}
      <ConversationList
        label={t("list.label")}
        conversations={data.conversations}
        className="min-w-0 md:min-h-0 md:flex-1 md:overflow-y-auto"
        empty={
          filtered ? (
            <EmptyState
              icon={<SearchX strokeWidth={1.5} />}
              title={t("empty.noMatchTitle")}
              description={
                params.q
                  ? t("empty.noMatchText", { query: params.q })
                  : t("empty.noMatchLabel")
              }
              action={
                <UiLink
                  href={`${listPath}${params.view === "alle" ? "" : `?${VIEW_PARAM}=${params.view}`}`}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  {t("empty.reset")}
                </UiLink>
              }
              className="py-6"
            />
          ) : (
            <EmptyState
              icon={<MessageSquare strokeWidth={1.5} />}
              title={t(`empty.${params.view}Title`)}
              description={
                params.view === "alle"
                  ? area === "studio"
                    ? t("empty.alleStudio")
                    : t("empty.alleMember")
                  : t(`empty.${params.view}Text`)
              }
              action={
                params.view === "alle" ? (
                  area === "member" ? (
                    <UiLink
                      href={discoverHref}
                      className={buttonVariants({ variant: "primary" })}
                    >
                      {t("empty.discover")}
                    </UiLink>
                  ) : undefined
                ) : (
                  <UiLink
                    href={listPath}
                    className={buttonVariants({ variant: "secondary" })}
                  >
                    {t("empty.toAll")}
                  </UiLink>
                )
              }
              className="py-6"
            />
          )
        }
      />
    </section>
  );
}
