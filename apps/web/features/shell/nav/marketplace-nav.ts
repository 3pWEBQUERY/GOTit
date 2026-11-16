import type { Viewer } from "@app/core/identity";
import type { MegaMenuColumn, MegaMenuLink } from "@app/ui";
import type { ShellData } from "../queries/get-shell-data";
import type { HrefBuilder } from "./href";

type Translate = (key: string) => string;

function regionLinks(regions: ShellData["regions"], href: HrefBuilder): MegaMenuLink[] {
  return regions.map((region) => ({
    label: region.name,
    href:
      region.kind === "CITY" && region.cantonSlug
        ? href({ pathname: "/ch/[kanton]/[stadt]", params: { kanton: region.cantonSlug, stadt: region.slug } })
        : href({ pathname: "/ch/[kanton]", params: { kanton: region.slug } }),
  }));
}

/** Spalten des Mega-Menüs «Entdecken» (PRD 6.3). Dieselben Ziele füllen das Entdecken-Sheet. */
export function buildDiscoverColumns(t: Translate, href: HrefBuilder, data: ShellData, viewer: Viewer): MegaMenuColumn[] {
  const forYou: MegaMenuColumn =
    viewer.kind === "account"
      ? {
          heading: t("discover.forYou"),
          links: [
            { label: t("discover.savedSearches"), href: href("/suchen") },
            { label: t("discover.recentlyViewed"), href: `${href("/ich")}#zuletzt-angesehen` },
            { label: t("discover.favouritesWithChanges"), href: href("/favoriten") },
          ],
        }
      : { heading: t("discover.forYou"), links: [], note: t("discover.accountNote"), more: { label: t("createAccount"), href: href("/registrieren") } };

  return [
    { heading: t("discover.regions"), links: regionLinks(data.regions, href), more: { label: t("discover.allCantons"), href: href("/ch") } },
    {
      heading: t("discover.categories"),
      links: data.categories.map((category) => ({
        label: category.name,
        href: href({ pathname: "/kategorie/[slug]", params: { slug: category.slug } }),
      })),
      more: { label: t("discover.allCategories"), href: href("/suche") },
    },
    {
      heading: t("discover.now"),
      links: [
        { label: t("discover.availableToday"), href: href({ pathname: "/suche", query: { verfuegbar: "heute" } }) },
        { label: t("discover.newProfiles"), href: href({ pathname: "/suche", query: { sortierung: "neu" } }) },
        { label: t("discover.onTour"), href: href("/touren") },
        { label: t("discover.withReviews"), href: href({ pathname: "/suche", query: { bewertungen: "1" } }) },
      ],
    },
    forYou,
  ];
}

/** Spalten des Mega-Menüs «Community» (PRD 6.3). */
export function buildCommunityColumns(t: Translate, href: HrefBuilder): MegaMenuColumn[] {
  return [
    {
      heading: t("community.read"),
      links: [
        { label: t("community.feed"), href: href("/community") },
        { label: t("community.stories"), href: `${href("/community")}#stories` },
        { label: t("community.blogs"), href: href("/community/blogs") },
      ],
    },
    {
      heading: t("community.outAndAbout"),
      links: [
        { label: t("community.tours"), href: href("/touren") },
        { label: t("community.events"), href: href("/community/events") },
      ],
    },
    {
      heading: t("community.takePart"),
      links: [
        { label: t("community.writePost"), href: href("/studio/beitraege/neu") },
        { label: t("community.rules"), href: href("/community/regeln") },
        { label: t("community.reportAndHelp"), href: href("/melden") },
      ],
    },
  ];
}

/** Einfaches Menü «Mehr». */
export function buildMoreLinks(t: Translate, href: HrefBuilder): MegaMenuLink[] {
  return [
    { label: t("more.forProviders"), href: href("/fuer-anbieter") },
    { label: t("more.forClubs"), href: href("/fuer-clubs") },
    { label: t("more.pricing"), href: href("/preise") },
    { label: t("more.safety"), href: href("/sicherheit") },
    { label: t("more.help"), href: href("/hilfe") },
    { label: t("more.about"), href: href("/ueber-uns") },
  ];
}
