import type { RegionSummary } from "@app/core/geo";
import { Button, EmptyState, UiLink } from "@app/ui";
import { MapPin } from "lucide-react";

export interface DiscoverEmptyProps {
  title: string;
  description: string;
  /** Die eine Aktion, wenn es keine andere Region gibt. */
  action?: { label: string; href: string };
  otherRegionsLabel: string;
  otherRegions: readonly (RegionSummary & { href: string })[];
}

/** Leerzustand von Entdecken: nennt die nächsten Regionen, keine Sackgasse (PRD 9.1, 8.2). */
export function DiscoverEmpty({ title, description, action, otherRegionsLabel, otherRegions }: DiscoverEmptyProps) {
  return (
    <div className="flex flex-col gap-6">
      <EmptyState
        icon={<MapPin strokeWidth={1.5} />}
        title={title}
        description={description}
        action={
          action ? (
            <Button asChild variant="secondary">
              <UiLink href={action.href}>{action.label}</UiLink>
            </Button>
          ) : undefined
        }
      />
      {otherRegions.length > 0 ? (
        <nav aria-labelledby="other-regions">
          <h2 id="other-regions" className="mb-2 text-h2">
            {otherRegionsLabel}
          </h2>
          <ul className="flex flex-wrap gap-x-4">
            {otherRegions.map((region) => (
              <li key={region.slug}>
                <UiLink href={region.href} className="inline-flex min-h-11 items-center text-body text-ink underline underline-offset-4 hover:text-accent">
                  {region.name}
                </UiLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
