import { ContactBar, UiLink, cn } from "@app/ui";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { StartConversation } from "../../../messages/components/start-conversation";
import type { ContactState } from "../../model";

/** «Nachricht schreiben» für Betrachter, die nicht Inhaber sind; fehlt für den Inhaber und in Vorschauen. */
export interface ContactMessage {
  slug: string;
  /** Besucher: Weg zur Anmeldung mit Rückkehr zum Profil. */
  signInHref: string | null;
}

/** «Termin anfragen» für Betrachter, die nicht Inhaber sind: öffnet `/p/[name]/anfrage` (v2 10.1). */
export interface ContactRequest {
  href: string;
}

/**
 * Der Satz an Stelle der Kontaktaktionen. Inhaber und Vorschauen sehen, was
 * Mitglieder hier tun können, statt toter Knöpfe (Entscheid 0012).
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
      if (!contact.messages) return t("ownerBookings");
      return contact.bookingRequests ? t("ownerBoth") : t("ownerMessages");
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
  /** Nur auf `/p/[name]` für andere als den Inhaber (Entscheid 0014). */
  message?: ContactMessage;
  /** Nur auf `/p/[name]` für andere als den Inhaber (Entscheid 0016). */
  request?: ContactRequest;
  className?: string;
  children?: ReactNode;
}

/** Kontakt der Profilseite in der ContactBar: Spalte ab 768 px, Leiste aus Glas darunter. */
export function ProfileContact({ contact, variant, reportHref, message, request, className, children }: ProfileContactProps) {
  const t = useTranslations("profile.contact");
  const notice = useContactNotice(contact);
  const canMessage = contact.kind === "open" && contact.messages && message !== undefined;
  const canRequest = contact.kind === "open" && contact.bookingRequests && request !== undefined;
  return (
    <ContactBar
      variant={variant}
      label={t("label")}
      request={canRequest ? { label: t("request"), href: request.href } : undefined}
      message={canMessage ? <StartConversation slug={message.slug} signInHref={message.signInHref} variant={canRequest ? "secondary" : "primary"} /> : undefined}
      paused={canMessage || canRequest ? undefined : notice}
      report={reportHref ? <ReportLink href={reportHref} /> : undefined}
      className={className}
    >
      {children}
    </ContactBar>
  );
}
