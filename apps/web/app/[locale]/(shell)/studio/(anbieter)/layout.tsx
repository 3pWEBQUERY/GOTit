import { resolveStudioEntry } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { redirect } from "@/i18n/navigation";
import { ProfileStatusForViewer } from "@/features/shell/components/profile-status-for-viewer";
import { getViewer } from "@/features/shell/queries/get-viewer";

/** Persönliches Studio: nur mit Anbieterrolle, sonst der passende nächste Schritt (PRD 8.2). */
export default async function ProviderStudioLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const viewer = await getViewer();
  const entry = resolveStudioEntry(viewer);
  if (entry.target === "for-providers" || entry.target === "sign-in") return redirect({ href: "/fuer-anbieter", locale });
  if (entry.target === "onboarding") return redirect({ href: "/studio/start", locale });
  if (entry.target === "organization") return redirect({ href: { pathname: "/studio/o/[org]", params: { org: entry.slug } }, locale });
  return (
    <>
      <div className="mb-4 md:hidden">
        <ProfileStatusForViewer locale={locale} viewer={viewer} />
      </div>
      {children}
    </>
  );
}
