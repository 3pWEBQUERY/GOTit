import type { listOwnOrganizationLinks } from "@app/core/organization";
import { UiLink } from "@app/ui";
import { useFormatter, useTranslations } from "next-intl";

export type OwnLink = Awaited<
  ReturnType<typeof listOwnOrganizationLinks>
>[number];

/**
 * Name der Organisation (als Link nur, wenn ihre Seite veröffentlicht ist),
 * Art, Standort und Datum einer Einladung oder Verknüpfung.
 */
export function LinkSummary({
  link,
  id,
  clubHref,
  when,
}: {
  link: OwnLink;
  id: string;
  clubHref: string;
  when: "invited" | "since";
}) {
  const t = useTranslations("clubs");
  const format = useFormatter();
  const published = link.organization.status === "PUBLISHED";
  const date = format.dateTime(
    when === "since" ? (link.respondedAt ?? link.invitedAt) : link.invitedAt,
    { day: "2-digit", month: "2-digit", year: "numeric" },
  );
  const facts = [
    t(`kind.${link.organization.kind}`),
    link.location ? t("studio.location", { name: link.location.name }) : null,
    when === "since"
      ? t("studio.since", { date })
      : t("studio.invitedAt", { date }),
    published ? null : t("studio.notPublished"),
  ].filter(Boolean);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h3 id={id} className="text-h3 break-words">
        {published ? (
          <UiLink
            href={clubHref}
            className="underline underline-offset-4 hover:text-accent"
          >
            {link.organization.name}
          </UiLink>
        ) : (
          link.organization.name
        )}
      </h3>
      <p className="text-small text-ink-muted">{facts.join(" · ")}</p>
    </div>
  );
}
