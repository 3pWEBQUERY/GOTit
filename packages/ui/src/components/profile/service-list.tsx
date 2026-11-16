import type { ReactNode } from "react";
import { cn } from "../../cn";

export interface ServiceItem {
  key: string;
  label: string;
  /** Kurzer Zusatz hinter dem Eintrag, zum Beispiel «nach Absprache». */
  note?: ReactNode;
}

export interface ServiceGroup {
  key: string;
  /** Zwischenüberschrift der Gruppe. Ohne Angabe steht die Liste allein. */
  heading?: string;
  items: readonly ServiceItem[];
}

export interface ServiceListProps {
  groups: readonly ServiceGroup[];
  /** Ebene der Zwischenüberschriften, passend zur Seite. */
  headingLevel?: 3 | 4 | 5 | 6;
  className?: string;
}

/** Angebot als ruhige Liste, optional in Gruppen mit Zwischenüberschrift. Kein Chip-Teppich. */
export function ServiceList({ groups, headingLevel = 3, className }: ServiceListProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={cn("flex flex-col gap-6 text-ink", className)}>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          {group.heading ? <Heading className="text-label text-ink-muted">{group.heading}</Heading> : null}
          <ul className="grid gap-x-8 md:grid-cols-2">
            {group.items.map((item) => (
              <li key={item.key} className="flex flex-wrap items-baseline gap-x-2 border-b border-border py-2 text-body">
                <span>{item.label}</span>
                {item.note ? <span className="text-small text-ink-muted">{item.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
