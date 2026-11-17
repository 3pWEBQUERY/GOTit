import type { Locale } from "@app/core/locale";
import { getSupportTicket } from "@app/core/support";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { TicketView } from "@/features/admin/support/ticket-view";

type Props = { params: Promise<{ locale: string; ticket: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "ticket");
}

/** Eine Anfrage `/admin/support/[ticket]`; der Aufruf steht im Audit-Log (`support.viewed`). */
export default async function TicketPage({ params }: Props) {
  const { locale: rawLocale, ticket: id } = await params;
  const locale = rawLocale as Locale;
  const access = await areaAccess("support.handle");
  if (!access.allowed) return <RestrictedArea locale={locale} area="support" />;
  const ticket = await getSupportTicket(access.actor.userId, id);
  if (!ticket) notFound();
  return <TicketView locale={locale} actor={access.actor} ticket={ticket} />;
}
