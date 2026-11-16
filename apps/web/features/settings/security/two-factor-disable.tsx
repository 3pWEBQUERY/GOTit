"use client";

import { Button, ConfirmDialog, InlineAlert, TextField } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { authErrorKey, settingsAuthClient } from "../auth-client";

/** Zweiten Faktor abschalten: Passwort und Rückfrage, die die Folge nennt. */
export function TwoFactorDisable({ onDisabled }: { onDisabled: () => void }) {
  const t = useTranslations("settings");
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<{ field: boolean; key: string } | null>(null);

  function ask() {
    if (!password) return setError({ field: true, key: "passwordRequired" });
    setError(null);
    setOpen(true);
  }

  async function disable() {
    const { error: authError } = await settingsAuthClient().twoFactor.disable({ password });
    if (authError) {
      const key = authErrorKey(authError);
      setError({ field: key === "passwordWrong", key });
      setOpen(false);
      return;
    }
    setPassword("");
    onDisabled();
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h3">{t("security.twoFactor.disableTitle")}</h3>
      {error && !error.field ? <InlineAlert tone="error" title={t(`errors.${error.key}`)} /> : null}
      <TextField
        id="zweifaktor-abschalten-passwort"
        type="password"
        autoComplete="current-password"
        label={t("security.twoFactor.disablePassword")}
        value={password}
        error={error?.field ? t(`errors.${error.key}`) : undefined}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button variant="destructive" className="self-start" onClick={ask}>
        {t("security.twoFactor.disable")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("security.twoFactor.disableConfirmTitle")}
        description={t("security.twoFactor.disableConfirmText")}
        confirmLabel={t("security.twoFactor.disable")}
        cancelLabel={t("security.twoFactor.cancelDialog")}
        onConfirm={disable}
      />
    </div>
  );
}
