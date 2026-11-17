"use client";

import {
  Button,
  EmptyState,
  InlineAlert,
  Sheet,
  SheetContent,
  SidePanel,
  SidePanelContent,
} from "@app/ui";
import { CalendarX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { StartConversation } from "../../../messages/components/start-conversation";
import type { RequestDraft } from "../../lib/draft";
import type { ClientSlots } from "../../lib/types";
import { RequestForm } from "./request-form";
import { RequestSent } from "./request-sent";
import { useRequestForm } from "./use-request-form";

export type RequestPanelState = "ready" | "no-slots" | "closed";

export interface RequestPanelProps {
  slug: string;
  name: string;
  state: RequestPanelState;
  slots: ClientSlots;
  regions: readonly { id: string; name: string }[];
  initial: RequestDraft;
  signedIn: boolean;
  /** «Nachricht schreiben» als Ausweg, wenn das Profil Nachrichten annimmt; Besucher über die Anmeldung. */
  message: { signInHref: string | null } | null;
  /** Das Profil ohne Panel; Schliessen führt dorthin zurück. */
  closeHref: string;
}

/** Breite ab 768 px: Seitenpanel; darunter Sheet (v2 10.1). `null`, bis der Browser es weiss. */
function useWide(): boolean | null {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

/**
 * Terminanfrage über dem Profil unter `/p/[name]/anfrage` (v2 10.2): Panel
 * auf Desktop, Sheet auf Mobile, jeweils mit eigener URL. Schliessen mit
 * Eingaben fragt im Panel nach, nicht in einem zweiten Dialog (PRD 13).
 */
export function RequestPanel({
  slug,
  name,
  state,
  slots,
  regions,
  initial,
  signedIn,
  message,
  closeHref,
}: RequestPanelProps) {
  const t = useTranslations("booking.panel");
  const router = useRouter();
  const wide = useWide();
  const form = useRequestForm({ slug, slots, initial, signedIn });
  const [confirming, setConfirming] = useState(false);
  const dirty = state === "ready" && form.dirty && !form.sent;

  const close = () => router.replace(closeHref, { scroll: false });
  function requestClose() {
    if (dirty) setConfirming(true);
    else close();
  }
  function guard(event: Event) {
    if (!dirty) return;
    event.preventDefault();
    setConfirming(true);
  }

  const messageAction = message ? (
    <StartConversation
      slug={slug}
      signInHref={message.signInHref}
      variant="secondary"
    />
  ) : null;
  let body: ReactNode;
  if (form.sent)
    body = <RequestSent sent={form.sent} name={name} onClose={close} />;
  else if (state !== "ready")
    body = (
      <EmptyState
        icon={<CalendarX strokeWidth={1.5} />}
        title={t(state === "closed" ? "closedTitle" : "emptyTitle")}
        description={t(state === "closed" ? "closedText" : "emptyText", {
          name,
        })}
        action={messageAction ?? <Button onClick={close}>{t("back")}</Button>}
      />
    );
  else
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-small text-ink-muted">{t("voluntary", { name })}</p>
        {confirming ? (
          <InlineAlert
            tone="warning"
            title={t("unsavedTitle")}
            action={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    form.discard();
                    close();
                  }}
                >
                  {t("discard")}
                </Button>
                <Button variant="quiet" onClick={() => setConfirming(false)}>
                  {t("keep")}
                </Button>
              </>
            }
          >
            {t("unsavedText")}
          </InlineAlert>
        ) : null}
        <RequestForm
          form={form}
          name={name}
          timeZone={slots.timeZone}
          regions={regions}
          signedIn={signedIn}
          onCancel={requestClose}
        />
      </div>
    );

  const title = t("title", { name });
  if (wide === null) return null;
  if (wide)
    return (
      <SidePanel
        open
        onOpenChange={(open) => (open ? undefined : requestClose())}
      >
        <SidePanelContent
          title={title}
          closeLabel={t("close")}
          onEscapeKeyDown={guard}
          onInteractOutside={guard}
          data-booking-panel="panel"
        >
          {body}
        </SidePanelContent>
      </SidePanel>
    );
  return (
    <Sheet open onOpenChange={(open) => (open ? undefined : requestClose())}>
      <SheetContent
        title={title}
        closeLabel={t("close")}
        handleLabel={t("handle")}
        defaultDetent="full"
        onEscapeKeyDown={guard}
        onInteractOutside={guard}
        data-booking-panel="sheet"
      >
        {body}
      </SheetContent>
    </Sheet>
  );
}
