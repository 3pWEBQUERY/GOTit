"use client";

import { Button, InlineAlert } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { startIdentityCheckAction, type CheckOrigin } from "../actions/start-identity-check";

/** Startet die Prüfung und führt zum Dienstleister. Ohne Dienstleister sagt es das, statt still zu scheitern. */
export function StartCheckButton({ origin, label, variant = "primary" }: { origin: CheckOrigin; label: string; variant?: "primary" | "secondary" }) {
  const t = useTranslations("onboarding.errors");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const result = await startIdentityCheckAction({ locale, origin });
      if (result.ok && result.data) {
        window.location.assign(result.data.redirectUrl);
        return;
      }
      setError(!result.ok && result.formError && t.has(result.formError) ? result.formError : "generic");
    } catch {
      setError("generic");
    }
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <InlineAlert tone="error" title={t(error)} /> : null}
      <Button variant={variant} loading={pending} onClick={() => void start()} className="self-start">
        {label}
      </Button>
    </div>
  );
}
