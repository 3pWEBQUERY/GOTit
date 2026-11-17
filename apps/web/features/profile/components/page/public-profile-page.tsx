import type { Locale } from "@app/core/locale";
import { PROFILE_SECTIONS, type ProfileSection } from "@app/core/provider-profile/schemas";
import { Breadcrumbs, EmptyState, UiLink, buttonVariants } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProfileFavorite } from "../../../favorites/components/profile-favorite";
import { loadProfileFavorite } from "../../../favorites/queries/load-profile-favorite";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { createHref } from "../../../shell/nav/href";
import { getViewer } from "../../../shell/queries/get-viewer";
import { toViewModel } from "../../model";
import { loadEditor } from "../../queries/load-editor";
import { loadPublicProfile } from "../../queries/load-public-profile";
import { regionHref } from "../../region-href";
import { EDIT_PARAM, sectionFromSlug, sectionSlug } from "../../sections";
import { HideTabBar } from "../view/hide-tab-bar";
import { ProfileGallery } from "../view/profile-gallery";
import { ProfileView } from "../view/profile-view";
import { EditPanel } from "./edit-panel";
import { MembersOnly } from "./members-only";
import { OwnerBar } from "./owner-bar";
import { ProfileTabs, type ProfileTab } from "./profile-tabs";

export interface PublicProfilePageProps {
  locale: Locale;
  slug: string;
  tab: ProfileTab;
  /** Wert von `?bearbeiten`: der Abschnitt im Seitenpanel, nur für den Inhaber. */
  edit?: string;
}

/** Anbieterprofil `/p/[name]` und seine Tabs (PRD v2 10). Server-gerendert; was öffentlich ist, entscheidet der Kern. */
export async function PublicProfilePage({ locale, slug, tab, edit }: PublicProfilePageProps) {
  const result = await loadPublicProfile(slug, locale);
  if (!result) notFound();
  const href = createHref(locale);
  const t = await getTranslations({ locale, namespace: "profile" });
  if (result.state === "members-only") {
    const weiter = href({ pathname: "/p/[name]", params: { name: result.slug } });
    return <MembersOnly displayName={result.displayName} signInHref={href({ pathname: "/anmelden", query: { weiter } })} registerHref={href("/registrieren")} />;
  }

  const { profile, owner } = result;
  const tabLinks = { overview: href({ pathname: "/p/[name]", params: { name: profile.slug } }), media: href({ pathname: "/p/[name]/medien", params: { name: profile.slug } }) };
  const here = tabLinks[tab];
  const model = toViewModel(profile, { paused: result.state === "paused", regionHref: (region) => regionHref(locale, region) });
  const editLinks = owner
    ? (Object.fromEntries(PROFILE_SECTIONS.map((section) => [section, `${here}?${EDIT_PARAM}=${sectionSlug(locale, section)}`])) as Record<ProfileSection, string>)
    : undefined;
  const editSection = owner ? sectionFromSlug(edit) : null;
  const viewer = await getViewer();
  const editor = editSection && viewer.kind === "account" ? await loadEditor(viewer, locale) : null;
  // Herz und Sammlungen für alle ausser dem Inhaber (PRD v2 9.3); Besucher gehen zur Anmeldung und zurück.
  const favorite = owner ? null : { data: await loadProfileFavorite(viewer, profile.slug), signInHref: viewer.kind === "account" ? null : href({ pathname: "/anmelden", query: { weiter: here } }) };
  const region = model.regions[0];

  return (
    <div className="flex flex-col gap-6">
      <TopBarTitle title={profile.displayName} />
      <HideTabBar />
      {owner && editLinks ? <OwnerBar owner={owner} links={editLinks} studioHref={href("/studio/profil")} /> : null}
      <Breadcrumbs
        label={t("page.breadcrumbs")}
        items={[{ label: t("page.discover"), href: href("/") }, ...(region ? [{ label: region.name, href: region.href ?? undefined }] : []), { label: profile.displayName }]}
      />
      <ProfileView
        model={model}
        now={new Date().toISOString()}
        layout="responsive"
        nameLevel={1}
        reportHref={href("/melden")}
        mediaHref={tabLinks.media}
        tabs={<ProfileTabs current={tab} links={tabLinks} />}
        editLinks={editLinks}
        actions={favorite ? <ProfileFavorite slug={profile.slug} data={favorite.data} signInHref={favorite.signInHref} favoritesHref={href("/favoriten")} /> : undefined}
      >
        {tab === "media" ? (
          model.media.length > 0 ? (
            <ProfileGallery name={model.displayName} media={model.media} layout="responsive" variant="grid" />
          ) : (
            <EmptyState
              title={t("media.empty")}
              description={t("media.emptyHint")}
              action={
                <UiLink href={tabLinks.overview} className={buttonVariants({ variant: "secondary" })}>
                  {t("media.toOverview")}
                </UiLink>
              }
            />
          )
        ) : undefined}
      </ProfileView>
      {editor && editSection ? <EditPanel section={editSection} data={{ editor: editor.editor, regionGroups: editor.regionGroups, categories: editor.categories }} closeHref={here} /> : null}
    </div>
  );
}
