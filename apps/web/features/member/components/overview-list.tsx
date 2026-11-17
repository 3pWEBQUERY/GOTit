import { Button, EmptyState, UiLink } from "@app/ui";
import type { ReactNode } from "react";
import type { OverviewEntry } from "../queries/get-member-overview";

export interface OverviewListProps {
  id: string;
  title: string;
  entries: readonly OverviewEntry[];
  empty: { title: string; text: string; icon: ReactNode; action: { label: string; href: string } };
  /** Weg zur ganzen Liste, wenn die Übersicht nur einen Teil zeigt. */
  more?: { label: string; href: string };
}

/** Eine Liste der Übersicht: Einträge als Links oder ein Satz mit der einen Aktion, die sie füllt. */
export function OverviewList({ id, title, entries, empty, more }: OverviewListProps) {
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
        <>
          <ul className="flex flex-col divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id}>
                <UiLink href={entry.href} className="flex min-h-11 flex-col gap-1 py-3 hover:text-accent">
                  <span className="text-body font-[550] break-words">{entry.title}</span>
                  <span className="text-small text-ink-muted">
                    {entry.detail}
                    {entry.time ? (
                      <>
                        {" · "}
                        <time dateTime={entry.time.iso} title={entry.time.exact} className="tabular">
                          {entry.time.relative}
                        </time>
                      </>
                    ) : null}
                  </span>
                </UiLink>
              </li>
            ))}
          </ul>
          {more ? (
            <UiLink href={more.href} className="inline-flex min-h-11 items-center self-start text-small font-[550] text-accent underline-offset-4 hover:underline">
              {more.label}
            </UiLink>
          ) : null}
        </>
      )}
    </section>
  );
}
