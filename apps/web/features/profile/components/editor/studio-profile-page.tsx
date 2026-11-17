import type { Locale } from "@app/core/locale";
import { PROFILE_SECTIONS, type ProfileSection } from "@app/core/provider-profile/schemas";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAccount } from "../../../account/require-account";
import { createHref } from "../../../shell/nav/href";
import { loadEditor } from "../../queries/load-editor";
import { sectionSlug } from "../../sections";
import { ProfileEditor } from "./profile-editor";

/** «Mein Profil» `/studio/profil` und `/studio/profil/[abschnitt]` (PRD v2 11.2). Entwürfe leitet das Layout ins Onboarding. */
export async function StudioProfilePage({ locale, section }: { locale: Locale; section: ProfileSection | null }) {
  const viewer = await requireAccount(locale);
  const [data, t] = await Promise.all([loadEditor(viewer, locale), getTranslations({ locale, namespace: "studio.status" })]);
  if (!data) notFound();
  const href = createHref(locale);
  const links = {
    sections: Object.fromEntries(
      PROFILE_SECTIONS.map((entry) => [entry, href({ pathname: "/studio/profil/[abschnitt]", params: { abschnitt: sectionSlug(locale, entry) } })]),
    ) as Record<ProfileSection, string>,
    list: href("/studio/profil"),
    marketplace: href({ pathname: "/p/[name]", params: { name: data.editor.slug } }),
  };
  return (
    <ProfileEditor
      section={section}
      data={{ editor: data.editor, base: data.base, regionGroups: data.regionGroups, regionLinks: data.regionLinks, categories: data.categories }}
      links={links}
      statusLabel={`${t("prefix")} ${t(data.editor.status)}`}
      now={new Date().toISOString()}
    />
  );
}
