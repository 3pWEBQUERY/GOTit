import type { Locale } from "@app/core/locale";
import { Button, EmptyState, UiLink } from "@app/ui";
import { MailX } from "lucide-react";
import { useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";

/** Ehrlicher Zustand ohne eingerichteten E-Mail-Versand: keine Bestätigung, also kein Konto (Abnahme 5). */
export function RegistrationClosed({ locale }: { locale: Locale }) {
  const t = useTranslations("auth.register.closed");
  return (
    <EmptyState
      icon={<MailX strokeWidth={1.5} />}
      title={t("title")}
      description={t("description")}
      action={
        <Button asChild variant="secondary">
          <UiLink href={getPathname({ href: "/", locale })}>{t("action")}</UiLink>
        </Button>
      }
    />
  );
}
