import { Children, isValidElement, type ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { AuthorAvatar } from "./author-avatar";

export interface StoryRingProps {
  name: string;
  initials: string;
  avatarSrc?: string;
  /** Alle Teile der Story wurden gesehen. Ungesehen trägt den Akzent-Ring. */
  seen?: boolean;
  /** Zustand als Wort für Screenreader, zum Beispiel «neu» oder «gesehen». */
  stateLabel: string;
  /** Mit `href` ein Link, sonst ein Button mit `onSelect`. */
  href?: string;
  onSelect?: () => void;
  className?: string;
}

/** Runder Avatar mit Ring als Einstieg in eine Story. Der Name steht einzeilig darunter. */
export function StoryRing({ name, initials, avatarSrc, seen = false, stateLabel, href, onSelect, className }: StoryRingProps) {
  const classes = cn("group relative flex w-20 shrink-0 flex-col items-center gap-2 rounded-control py-1 text-small text-ink", className);
  const content = (
    <>
      <span className={cn("rounded-full border-2 p-1 transition-colors duration-state", seen ? "border-border-strong" : "border-accent")}>
        <AuthorAvatar initials={initials} src={avatarSrc} size="lg" className="group-hover:bg-border" />
      </span>
      <span className="block w-full truncate text-center" title={name}>
        {name}
      </span>
      <span className="sr-only">{stateLabel}</span>
    </>
  );
  if (href) {
    return (
      <UiLink href={href} data-seen={seen} className={classes} onClick={onSelect}>
        {content}
      </UiLink>
    );
  }
  return (
    <button type="button" data-seen={seen} className={classes} onClick={onSelect}>
      {content}
    </button>
  );
}

export interface StoryRingRowProps {
  /** Zugänglicher Name der Reihe, zum Beispiel «Stories». */
  label: string;
  /** `StoryRing`-Elemente. */
  children: ReactNode;
  className?: string;
}

/** Horizontale, scrollbare Reihe von Stories. Der Anschnitt am Rand zeigt, dass es weitergeht. */
export function StoryRingRow({ label, children, className }: StoryRingRowProps) {
  return (
    <ul aria-label={label} className={cn("flex gap-2 overflow-x-auto py-1", className)}>
      {Children.toArray(children).map((child) => (
        <li key={isValidElement(child) ? child.key : String(child)} className="shrink-0">
          {child}
        </li>
      ))}
    </ul>
  );
}
