"use client";

import { Button, InlineAlert, UiLink } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@app/core/locale";
import type { SentRequest } from "./use-request-form";

/** «Anfrage gesendet» mit den Wegen zur Anfrage und zur Unterhaltung (v2 10.2). */
export function RequestSent({
  sent,
  name,
  onClose,
}: {
  sent: SentRequest;
  name: string;
  onClose: () => void;
}) {
  const t = useTranslations("booking.sent");
  const locale = useLocale() as Locale;
  const requestHref = getPathname({
    href: { pathname: "/termine/[id]", params: { id: sent.requestId } },
    locale,
  });
  const threadHref = getPathname({
    href: {
      pathname: "/nachrichten/[id]",
      params: { id: sent.conversationId },
    },
    locale,
  });
  return (
    <div className="flex flex-col gap-4" data-booking-sent>
      <InlineAlert tone="success" title={t("title")}>
        {t("text", { name })}
      </InlineAlert>
      <div className="flex flex-col gap-2 xs:flex-row xs:flex-wrap">
        <Button asChild variant="primary">
          <UiLink href={requestHref}>{t("toRequest")}</UiLink>
        </Button>
        <Button asChild variant="secondary">
          <UiLink href={threadHref}>{t("toThread")}</UiLink>
        </Button>
        <Button variant="quiet" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
    </div>
  );
}
