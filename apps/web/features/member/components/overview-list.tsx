import { Button, EmptyState, UiLink } from "@app/ui";
import type { ReactNode } from "react";
import type { OverviewEntry } from "../queries/get-member-overview";

export interface OverviewListProps {
  id: string;
  title: string;
  entries: readonly OverviewEntry[];
  empty: { title: string; text: string; icon: ReactNode; action: { label: string; href: string } };
}

/** Eine Liste der Übersicht: Einträge als Links oder ein Satz mit der einen Aktion, die sie füllt. */
export function OverviewList({ id, title, entries, empty }: OverviewListProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-24 flex-col gap-2 border-t border-border pt-6">
      <h2 id={`${id}-title`} className="text-h2">
        {title}
      </h2>
      {entries.length === 0 ? (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.text}
          action={
            <Button asChild>
              <UiLink href={empty.action.href}>{empty.action.label}</UiLink>
            </Button>
          }
          className="py-4"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <li key={entry.id}>
              <UiLink href={entry.href} className="flex min-h-11 flex-col gap-1 py-3 hover:text-accent">
                <span className="text-body font-[550]">{entry.title}</span>
                <span className="text-small text-ink-muted">{entry.detail}</span>
              </UiLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
