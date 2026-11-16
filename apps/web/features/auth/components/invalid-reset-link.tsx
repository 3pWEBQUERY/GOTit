import { Button, InlineAlert, UiLink } from "@app/ui";
import { useTranslations } from "next-intl";

/** Abgelaufener oder schon benutzter Link: was passiert ist und der Weg zu einem neuen. */
export function InvalidResetLink({ forgotHref }: { forgotHref: string }) {
  const t = useTranslations("auth.reset.invalid");
  return (
    <InlineAlert
      tone="warning"
      title={t("title")}
      action={
        <Button asChild variant="primary">
          <UiLink href={forgotHref}>{t("action")}</UiLink>
        </Button>
      }
    >
      {t("body")}
    </InlineAlert>
  );
}
