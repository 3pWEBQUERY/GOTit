"use client";

import { Button, ConfirmDialog, InlineAlert, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { endLinkAction, respondToInvitationAction } from "../../actions/links";

/** «Annehmen» und «Ablehnen» einer offenen Einladung; die Antwort gilt sofort und erscheint als Toast. */
export function InvitationActions({
  linkId,
  name,
}: {
  linkId: string;
  name: string;
}) {
  const t = useTranslations("clubs.studio");
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const respond = (accept: boolean) =>
    startTransition(async () => {
      setError(null);
      const result = await respondToInvitationAction(linkId, accept);
      if (!result.ok) {
        setError(t(`errors.${result.formError ?? "generic"}`));
        return;
      }
      toast({
        title: accept ? t("accepted", { name }) : t("declined", { name }),
        tone: "success",
      });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => respond(true)}
          disabled={pending}
          aria-label={t("acceptNamed", { name })}
        >
          {t("accept")}
        </Button>
        <Button
          onClick={() => respond(false)}
          disabled={pending}
          aria-label={t("declineNamed", { name })}
        >
          {t("decline")}
        </Button>
      </div>
      {error ? <InlineAlert tone="error" title={error} /> : null}
    </div>
  );
}

/** «Verknüpfung lösen» mit Rückfrage, die die Folge benennt (v2 13). */
export function EndLinkAction({
  linkId,
  name,
}: {
  linkId: string;
  name: string;
}) {
  const t = useTranslations("clubs.studio");
  const { toast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <ConfirmDialog
      trigger={<Button aria-label={t("endNamed", { name })}>{t("end")}</Button>}
      title={t("endTitle", { name })}
      description={t("endDescription", { name })}
      confirmLabel={t("end")}
      cancelLabel={t("cancel")}
      onOpenChange={(open) => {
        if (!open) setError(null);
      }}
      onConfirm={async () => {
        setError(null);
        const result = await endLinkAction(linkId);
        if (!result.ok) {
          setError(t(`errors.${result.formError ?? "generic"}`));
          throw new Error("end-link");
        }
        toast({ title: t("ended", { name }), tone: "success" });
        router.refresh();
      }}
    >
      {error ? <InlineAlert tone="error" title={error} /> : null}
    </ConfirmDialog>
  );
}
