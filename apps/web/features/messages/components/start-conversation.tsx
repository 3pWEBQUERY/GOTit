"use client";

import { Button, UiLink } from "@app/ui";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { RestrictionNotice } from "../../moderation/restriction-notice";
import { startConversationAction, type StartFailure } from "../actions/start";

export interface StartConversationProps {
  slug: string;
  /** Besucher: «Nachricht schreiben» führt zur Anmeldung und danach zurück zum Profil. */
  signInHref: string | null;
  variant: "primary" | "secondary";
}

/**
 * «Nachricht schreiben» auf dem Profil (v1 FR-CHAT-001). Öffnet die bestehende
 * Unterhaltung oder beginnt eine neue. Ein Problem steht am Button; eine
 * Blockierung wird nicht genannt (Entscheid 0014).
 */
export function StartConversation({
  slug,
  signInHref,
  variant,
}: StartConversationProps) {
  const t = useTranslations("messages.start");
  const [failure, setFailure] = useState<StartFailure | "generic" | null>(null);
  const [until, setUntil] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const icon = <MessageSquare aria-hidden strokeWidth={1.5} />;

  if (signInHref)
    return (
      <Button asChild variant={variant} width="full">
        <UiLink href={signInHref} data-start-conversation>
          {icon}
          <span className="text-center">{t("action")}</span>
        </UiLink>
      </Button>
    );

  return (
    <div className="flex w-full flex-col gap-1">
      <Button
        variant={variant}
        width="full"
        icon={icon}
        loading={pending}
        data-start-conversation
        onClick={() =>
          startTransition(async () => {
            setFailure(null);
            // Bei Erfolg leitet die Aktion in die Unterhaltung weiter.
            const result = await startConversationAction(slug).catch(() => ({
              ok: false as const,
              reason: "generic" as const,
            }));
            if (result && !result.ok) {
              setFailure(result.reason);
              setUntil("until" in result ? (result.until ?? null) : null);
            }
          })
        }
      >
        {t("action")}
      </Button>
      {failure === "restricted" ? (
        <RestrictionNotice kind="MESSAGING" restriction={{ until }} />
      ) : failure ? (
        <p role="alert" className="text-small text-error">
          {t(`errors.${failure}`)}
        </p>
      ) : null}
    </div>
  );
}
