"use client";

import { Button, ConfirmDialog, EmptyState, InlineAlert, useToast } from "@app/ui";
import { KeyRound, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authErrorKey, settingsAuthClient } from "../auth-client";

export interface PasskeyRow {
  id: string;
  name: string | null;
  created: string | null;
  backedUp: boolean;
}

/** Passkeys: Liste, hinzufügen und entfernen mit Rückfrage (PRD 7.5). */
export function PasskeyList({ passkeys }: { passkeys: readonly PasskeyRow[] }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    if (typeof window.PublicKeyCredential === "undefined") return setError("passkeyUnsupported");
    setAdding(true);
    try {
      const result = await settingsAuthClient().passkey.addPasskey();
      if (result?.error) return setError(authErrorKey(result.error));
      toast({ title: t("security.passkeys.added"), tone: "success" });
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const { error: authError } = await settingsAuthClient().passkey.deletePasskey({ id });
    if (authError) {
      setError(authErrorKey(authError));
      return;
    }
    toast({ title: t("security.passkeys.removed"), tone: "success" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <InlineAlert tone={error === "passkeyCancelled" ? "info" : "error"} title={t(`errors.${error}`)} /> : null}
      {passkeys.length === 0 ? (
        <EmptyState icon={<KeyRound strokeWidth={1.5} />} title={t("security.passkeys.emptyTitle")} description={t("security.passkeys.emptyText")} className="py-4" />
      ) : (
        <ul aria-label={t("security.passkeys.listLabel")} className="flex flex-col divide-y divide-border border-y border-border">
          {passkeys.map((passkey) => {
            const name = passkey.name ?? t("security.passkeys.unnamed");
            return (
              <li key={passkey.id} data-passkey className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-body font-[550] break-words">{name}</p>
                  <p className="text-small text-ink-muted">
                    {passkey.created ? t("security.passkeys.createdAt", { date: passkey.created }) : null}
                    {passkey.backedUp ? ` · ${t("security.passkeys.synced")}` : null}
                  </p>
                </div>
                <ConfirmDialog
                  trigger={<Button>{t("security.passkeys.remove")}</Button>}
                  title={t("security.passkeys.removeConfirmTitle")}
                  description={t("security.passkeys.removeConfirmText")}
                  confirmLabel={t("security.passkeys.remove")}
                  cancelLabel={t("security.passkeys.cancel")}
                  onConfirm={() => remove(passkey.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="primary" icon={<Plus strokeWidth={1.5} />} loading={adding} className="self-start" onClick={() => void add()}>
        {t("security.passkeys.add")}
      </Button>
    </div>
  );
}
