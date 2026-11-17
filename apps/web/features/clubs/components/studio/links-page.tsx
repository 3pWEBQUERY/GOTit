import type { Locale } from "@app/core/locale";
import { listOwnOrganizationLinks } from "@app/core/organization";
import { EmptyState, InlineAlert, UiLink } from "@app/ui";
import { Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { createHref } from "../../../shell/nav/href";
import { EndLinkAction, InvitationActions } from "./link-actions";
import { LinkSummary } from "./link-summary";

const listClass = "flex flex-col divide-y divide-border border-y border-border";

/**
 * `/studio/verknuepfungen` (v2 7.6): offene Einladungen annehmen oder
 * ablehnen, aktive Verknüpfungen lösen. Die Seite sagt, was die Organisation
 * sieht und was nicht (v1 FR-BUSINESS-003/005, Abnahme 1.11).
 */
export async function LinksPage({
  locale,
  userId,
}: {
  locale: Locale;
  userId: string;
}) {
  const [t, links] = await Promise.all([
    getTranslations({ locale, namespace: "clubs.studio" }),
    listOwnOrganizationLinks(userId),
  ]);
  const href = createHref(locale);
  const clubHref = (slug: string) =>
    href({ pathname: "/c/[slug]", params: { slug } });
  const invitations = links.filter((link) => link.status === "INVITED");
  const active = links.filter((link) => link.status === "ACTIVE");

  return (
    <div className="flex max-w-reading min-w-0 flex-col gap-8">
      <TopBarTitle title={t("title")} />
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-body text-ink-muted">{t("intro")}</p>
      </div>
      <InlineAlert tone="info" title={t("visibleTitle")}>
        {t("visible")}
      </InlineAlert>

      <section aria-labelledby="einladungen" className="flex flex-col gap-3">
        <h2 id="einladungen" className="text-h2">
          {t("invitations")}
        </h2>
        {invitations.length === 0 ? (
          <p className="text-body text-ink-muted">{t("noInvitations")}</p>
        ) : (
          <ul data-invitations className={listClass}>
            {invitations.map((link, index) => (
              <li key={link.id} data-link={link.id} className="py-4">
                <article
                  aria-labelledby={`einladung-${index}`}
                  className="flex flex-col gap-3"
                >
                  <LinkSummary
                    link={link}
                    id={`einladung-${index}`}
                    clubHref={clubHref(link.organization.slug)}
                    when="invited"
                  />
                  {link.message ? (
                    <blockquote className="max-w-prose border-l-2 border-border-strong pl-3 text-body whitespace-pre-line text-ink">
                      {link.message}
                    </blockquote>
                  ) : null}
                  <InvitationActions
                    linkId={link.id}
                    name={link.organization.name}
                  />
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="verknuepfungen" className="flex flex-col gap-3">
        <h2 id="verknuepfungen" className="text-h2">
          {t("active")}
        </h2>
        {active.length === 0 ? (
          <EmptyState
            icon={<Link2 strokeWidth={1.5} />}
            title={t("noActive")}
            description={t("noActiveHint")}
            action={
              <UiLink
                href={href("/clubs")}
                className="inline-flex min-h-11 items-center text-body text-ink underline underline-offset-4 hover:text-accent"
              >
                {t("toClubs")}
              </UiLink>
            }
          />
        ) : (
          <ul data-active-links className={listClass}>
            {active.map((link, index) => (
              <li
                key={link.id}
                data-link={link.id}
                className="flex flex-wrap items-start justify-between gap-3 py-4"
              >
                <LinkSummary
                  link={link}
                  id={`verknuepfung-${index}`}
                  clubHref={clubHref(link.organization.slug)}
                  when="since"
                />
                <EndLinkAction linkId={link.id} name={link.organization.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
