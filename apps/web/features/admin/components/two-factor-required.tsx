import type { Locale } from "@app/core/locale";
import { Button, SkipLink, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";

/** Interne Rolle ohne zweiten Faktor (PRD 16.2): erklärt den Weg statt einer Sperre ohne Ausweg. */
export async function TwoFactorRequired({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "admin" });
  const href = createHref(locale);
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <SkipLink href="#inhalt">{t("shell.skipToContent")}</SkipLink>
      <main id="inhalt" tabIndex={-1} className="mx-auto flex w-full max-w-reading flex-col gap-4 px-4 py-12 outline-none">
        <h1 className="text-h1">{t("twoFactor.title")}</h1>
        <p className="text-body text-ink-muted">{t("twoFactor.description")}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="primary">
            <UiLink href={href("/einstellungen/sicherheit")}>{t("twoFactor.action")}</UiLink>
          </Button>
          <Button asChild variant="secondary">
            <UiLink href={href("/")}>{t("shell.toMarketplace")}</UiLink>
          </Button>
        </div>
      </main>
    </div>
  );
}
