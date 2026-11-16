"use client";

import { Skeleton } from "@app/ui";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { readPendingEmail, subscribePendingEmail } from "../lib/pending-email";
import { ResendVerification } from "./resend-verification";

/** Wird auf dem Server gerendert: Die Adresse ist dort unbekannt, also «lädt». */
const serverSnapshot = (): undefined => undefined;

/** «Prüfe dein Postfach» mit der Adresse aus diesem Tab, falls bekannt. */
export function CheckInbox({ callbackURL }: { callbackURL: string }) {
  const t = useTranslations("auth.confirm.inbox");
  const email = useSyncExternalStore(subscribePendingEmail, readPendingEmail, serverSnapshot);

  if (email === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton lines={2} />
        <Skeleton variant="block" className="h-11 w-56 rounded-control" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-body text-ink">
        <p>{email ? t.rich("withEmail", { email, strong: (chunks) => <strong className="font-[550] break-all">{chunks}</strong> }) : t("withoutEmail")}</p>
        <p className="text-ink-muted">{t("expiry")}</p>
      </div>
      <section aria-labelledby="resend-title" className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 id="resend-title" className="text-h3 text-ink">
          {t("resendTitle")}
        </h2>
        <ResendVerification email={email} callbackURL={callbackURL} idPrefix="inbox" />
      </section>
    </div>
  );
}
