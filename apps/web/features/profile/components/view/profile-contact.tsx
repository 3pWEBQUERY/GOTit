import { ContactBar, UiLink, cn } from "@app/ui";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ContactState } from "../../model";

/**
 * Der Satz an Stelle der Kontaktaktionen. «Termin anfragen» (1.9) und
 * «Nachricht schreiben» (1.8) gibt es noch nicht; statt toter Knöpfe sagt die
 * Seite ehrlich, wann Kontakt möglich ist (Entscheid 0012).
 */
export function useContactNotice(contact: ContactState): string {
  const t = useTranslations("profile.contact");
  switch (contact.kind) {
    case "paused":
      return t("paused");
    case "restricted":
      return t("restricted");
    case "none":
      return t("none");
    case "open":
      if (contact.messages && contact.bookingRequests) return t("soonBoth");
      return contact.messages ? t("soonMessages") : t("soonBookings");
  }
}

export function ReportLink({ href, className }: { href: string; className?: string }) {
  const t = useTranslations("profile.contact");
  return (
    <UiLink href={href} className={cn("inline-flex min-h-11 items-center gap-2 text-small text-ink underline underline-offset-4 hover:text-accent", className)}>
      <Flag aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
      {t("report")}
    </UiLink>
  );
}

export interface ProfileContactProps {
  contact: ContactState;
  variant: "sticky-panel" | "mobile-bar";
  reportHref?: string;
  className?: string;
  children?: ReactNode;
}

/** Kontakt der Profilseite in der ContactBar: Spalte ab 768 px, Leiste aus Glas darunter. */
export function ProfileContact({ contact, variant, reportHref, className, children }: ProfileContactProps) {
  const t = useTranslations("profile.contact");
  const notice = useContactNotice(contact);
  return (
    <ContactBar
      variant={variant}
      label={t("label")}
      // Wird nicht gezeigt: Mit `paused` steht nur der Satz da. Die Aktion entsteht mit 1.9.
      request={{ label: t("request") }}
      paused={notice}
      report={reportHref ? <ReportLink href={reportHref} /> : undefined}
      className={className}
    >
      {children}
    </ContactBar>
  );
}
