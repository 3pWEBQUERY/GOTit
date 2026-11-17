import type { OrganizationKind } from "@app/db";
import { UiLink } from "@app/ui";
import { Building2, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export interface ClubListEntry {
  slug: string;
  name: string;
  kind: OrganizationKind;
  regionNames: string[];
  providerCount: number;
}

/** Kompakte Karte für `/clubs` und Entdecken (v2 9.1): Name, Art, Regionen, Zahl der Anbieter. Die ganze Karte ist ein Link. */
export function ClubListCard({
  entry,
  href,
  headingLevel,
}: {
  entry: ClubListEntry;
  href: string;
  headingLevel: 2 | 3;
}) {
  const t = useTranslations("clubs");
  const Heading = `h${headingLevel}` as const;
  return (
    <UiLink
      href={href}
      className="group flex min-h-11 items-center gap-4 rounded-card border border-border bg-surface p-4 text-ink transition-colors duration-state hover:bg-surface-2"
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted"
      >
        <Building2 strokeWidth={1.5} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Heading className="text-h3 break-words group-hover:underline">
          {entry.name}
        </Heading>
        <span className="text-small text-ink-muted">
          {[t(`kind.${entry.kind}`), entry.regionNames.join(", ")]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <span className="text-small text-ink-muted">
          {t("list.providerCount", { count: entry.providerCount })}
        </span>
      </span>
      <ChevronRight
        aria-hidden
        strokeWidth={1.5}
        className="size-5 shrink-0 text-ink-muted"
      />
    </UiLink>
  );
}
