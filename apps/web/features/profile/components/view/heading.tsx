import type { ReactNode } from "react";

export type HeadingLevel = 1 | 2 | 3 | 4;

/** Überschrift mit wählbarer Ebene, damit die Ansicht in Seite und Vorschau eine lückenlose Hierarchie behält. */
export function Heading({ level, id, className, children }: { level: HeadingLevel; id?: string; className?: string; children: ReactNode }) {
  const Tag = `h${level}` as const;
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  );
}

export function nextLevel(level: HeadingLevel): HeadingLevel {
  return level >= 4 ? 4 : ((level + 1) as HeadingLevel);
}
