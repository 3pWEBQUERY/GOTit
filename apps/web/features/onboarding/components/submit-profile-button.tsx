"use client";

import { Button, Checkbox, InlineAlert, UiLink } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitProfileAction } from "../actions/submit-profile";

export interface MissingLink {
  key: string;
  label: string;
  href: string;
}

/**
 * «Profil einreichen» ist nie deaktiviert (PRD 13). Fehlt etwas, nennt die
 * Antwort die Schritte mit Link; sonst geht es zu `/studio` mit dem Prüfstatus.
 */
export function SubmitProfileButton({ studioHref, links }: { studioHref: string; links: readonly MissingLink[] }) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [error, setError] = useState<{
    key: string;
    missing: readonly MissingLink[];
  } | null>(null);

  async function submit() {
    setError(null);
    if (!consent) {
      setConsentError(true);
      document.getElementById("publication-consent")?.focus();
      return;
    }
    setPending(true);
    try {
      const result = await submitProfileAction({ publicationConsent: true });
      if (result.ok) {
        router.push(studioHref);
        return;
      }
      const missing = links.filter((link) => result.fieldErrors?.[link.key]);
      setError({
        key: result.formError && t.has(`errors.${result.formError}`) ? result.formError : "generic",
        missing,
      });
    } catch {
      setError({ key: "generic", missing: [] });
    }
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <InlineAlert tone="error" title={t(`errors.${error.key}`)}>
          {error.missing.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {error.missing.map((link) => (
                <li key={link.key}>
                  <UiLink href={link.href} className="underline underline-offset-4 hover:text-ink">
                    {link.label}
                  </UiLink>
                </li>
              ))}
            </ul>
          ) : null}
        </InlineAlert>
      ) : null}
      <Checkbox
        id="publication-consent"
        label={t("submit.consent")}
        description={t("submit.consentHint")}
        checked={consent}
        error={consentError && !consent ? t("errors.publicationConsentRequired") : undefined}
        onCheckedChange={(value) => {
          setConsent(value === true);
          if (value === true) setConsentError(false);
        }}
      />
      <Button variant="primary" loading={pending} onClick={() => void submit()} className="self-start">
        {t("submit.button")}
      </Button>
    </div>
  );
}
