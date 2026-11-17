import type { Locale } from "@app/core/locale";
import { UiLink } from "@app/ui";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../../shell/nav/href";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import type { RequestView } from "../queries/request-view";
import { RequestDetail } from "./request-detail";

/** Eigene Seite einer Terminanfrage; «Unterhaltung öffnen» führt in den Thread (PRD 8, Querverweise). */
export async function RequestPage({
  locale,
  request,
  reportOpen,
}: {
  locale: Locale;
  request: RequestView;
  reportOpen: boolean;
}) {
  const t = await getTranslations({
    locale,
    namespace: "bookingStudio.request",
  });
  const href = createHref(locale);
  return (
    <div className="flex min-w-0 max-w-reading flex-col gap-6">
      <TopBarTitle title={t("title", { name: request.memberName })} />
      <UiLink
        href={href("/studio/anfragen")}
        className="inline-flex min-h-11 items-center gap-2 self-start text-body text-ink underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden strokeWidth={1.5} className="size-5" />
        {t("back")}
      </UiLink>
      <h1 className="text-h1 break-words">
        {t("title", { name: request.memberName })}
      </h1>
      <RequestDetail
        request={request}
        headingLevel={2}
        conversationHref={href({
          pathname: "/studio/nachrichten/[id]",
          params: { id: request.conversationId },
        })}
        report={{ mode: "dialog", initiallyOpen: reportOpen }}
      />
    </div>
  );
}
