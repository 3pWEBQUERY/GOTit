"use client";

import { Button, InlineAlert } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeStepAction } from "../actions/save-step";

/** «Schritt überspringen» oder «Vorschau bestätigen»: merkt den Schritt als erledigt und geht weiter. */
export function CompleteStepButton({ step, nextHref, label }: { step: "media" | "availability" | "preview"; nextHref: string; label: string }) {
  const t = useTranslations("onboarding.errors");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setPending(true);
    setError(null);
    try {
      const result = await completeStepAction(step);
      if (result.ok) {
        router.push(nextHref);
        return;
      }
      setError(result.formError && t.has(result.formError) ? result.formError : "generic");
    } catch {
      setError("generic");
    }
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <InlineAlert tone="error" title={t(error)} /> : null}
      <Button variant="primary" loading={pending} onClick={() => void complete()} className="self-start">
        {label}
      </Button>
    </div>
  );
}
