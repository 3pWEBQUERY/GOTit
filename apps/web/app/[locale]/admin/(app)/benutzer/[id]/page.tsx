import { getUserDetail } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { areaAccess } from "@/features/admin/areas/access";
import { areaMetadata } from "@/features/admin/areas/metadata";
import { RestrictedArea } from "@/features/admin/areas/restricted";
import { UserDetailView } from "@/features/admin/users/detail-view";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return areaMetadata((await params).locale as Locale, "user");
}

/** Ein Konto `/admin/benutzer/[id]`; der Aufruf steht im Audit-Log (`user.viewed`). */
export default async function UserDetailPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  const access = await areaAccess("users.view");
  if (!access.allowed) return <RestrictedArea locale={locale} area="users" />;
  const user = await getUserDetail(access.actor.userId, id);
  if (!user) notFound();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());
  return <UserDetailView locale={locale} actor={access.actor} user={user} today={today} />;
}
