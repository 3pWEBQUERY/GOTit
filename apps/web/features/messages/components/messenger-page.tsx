import type { Locale } from "@app/core/locale";
import { EmptyState, cn } from "@app/ui";
import { MessagesSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireAccount } from "../../account/require-account";
import { HideTabBar } from "../../profile/components/view/hide-tab-bar";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { createHref } from "../../shell/nav/href";
import { parseInboxParams } from "../lib/inbox-params";
import type { MessengerArea } from "../lib/types";
import { loadInbox, threadHref } from "../queries/load-inbox";
import { requireThread } from "../queries/load-thread";
import { HideFooterOnMobile } from "./hide-footer";
import { InboxColumn } from "./inbox/inbox-column";
import { MessengerLive } from "./messenger-live";
import { ThreadPanel } from "./thread/thread-panel";

export interface MessengerPageProps {
  locale: Locale;
  area: MessengerArea;
  search: Record<string, string | string[] | undefined>;
  /** Geöffnete Unterhaltung; fehlt auf `/nachrichten`. */
  conversationId?: string;
}

/**
 * Messenger (PRD v2 11.4, 7.5): Liste, Unterhaltung und Kontext. Das Studio
 * ergänzt Labels und Notiz. Unter 768 px ist die Liste eine eigene Seite und
 * die Unterhaltung ein Vollbild ohne Tab-Leiste (PRD v2 6.4).
 */
export async function MessengerPage({
  locale,
  area,
  search,
  conversationId,
}: MessengerPageProps) {
  const viewer = await requireAccount(locale);
  const params = parseInboxParams(search);
  const href = createHref(locale);
  const [t, opened] = await Promise.all([
    getTranslations({ locale, namespace: "messages" }),
    conversationId
      ? requireThread(locale, conversationId)
      : Promise.resolve(null),
  ]);
  const data = await loadInbox({
    userId: viewer.userId,
    locale,
    area,
    params,
    currentId: conversationId ?? null,
    href,
  });
  const listPath = href(
    area === "studio" ? "/studio/nachrichten" : "/nachrichten",
  );
  const currentPath = conversationId
    ? threadHref(href, area, conversationId)
    : listPath;
  const thread = opened?.thread ?? null;
  const profileHref = thread?.counterpart.profileSlug
    ? href({
        pathname: "/p/[name]",
        params: { name: thread.counterpart.profileSlug },
      })
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-4" data-messenger={area}>
      <TopBarTitle title={thread ? thread.counterpart.name : t("title")} />
      {thread ? (
        <>
          <HideTabBar />
          <HideFooterOnMobile />
        </>
      ) : null}
      <h1 className={cn("text-h1", thread && "max-md:sr-only")}>
        {t("title")}
      </h1>
      <MessengerLive url={process.env.REALTIME_URL || null} />
      <div className="grid min-w-0 gap-6 md:h-[calc(100dvh-13rem)] md:min-h-[32rem] md:grid-cols-[17rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <InboxColumn
          locale={locale}
          area={area}
          params={params}
          data={data}
          listPath={listPath}
          currentPath={currentPath}
          discoverHref={href("/")}
          className={thread ? "max-md:hidden" : undefined}
        />
        {thread && opened ? (
          <ThreadPanel
            key={thread.conversationId}
            thread={thread}
            pending={opened.pending}
            area={area}
            labels={data.labels}
            profileHref={profileHref}
            now={new Date().toISOString()}
          />
        ) : (
          <div className="hidden min-w-0 items-center justify-center rounded-card border border-border md:flex">
            <EmptyState
              icon={<MessagesSquare strokeWidth={1.5} />}
              title={t("noThreadTitle")}
              description={t("noThreadText")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
