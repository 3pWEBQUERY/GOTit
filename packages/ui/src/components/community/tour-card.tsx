import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { AuthorAvatar } from "./author-avatar";

export interface TourCardProps {
  /** Name des Anbieters. */
  name: string;
  /** Link zum Profil. */
  href: string;
  /** Region oder Regionen als fertiger Text, zum Beispiel «Bern, Thun». */
  regions: string;
  /** Zeitraum als fertiger Text, zum Beispiel «12.–14. Nov.». */
  period: string;
  /** Maschinenlesbarer Beginn für `<time dateTime>`. */
  dateTime?: string;
  initials?: string;
  avatarSrc?: string;
  className?: string;
}

/** Tour eines Anbieters, kompakt für die 3-Spalten-Liste und die horizontale Reihe. Die ganze Karte führt zum Profil. */
export function TourCard({ name, href, regions, period, dateTime, initials, avatarSrc, className }: TourCardProps) {
  return (
    <div className={cn("relative flex min-h-16 min-w-0 items-center gap-3 rounded-card border border-border bg-surface p-3 transition-colors duration-state hover:border-border-strong", className)}>
      {initials || avatarSrc ? <AuthorAvatar initials={initials ?? ""} src={avatarSrc} /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <UiLink href={href} className="text-body font-[600] text-ink underline-offset-4 after:absolute after:inset-0 after:rounded-card hover:underline">
          {name}
        </UiLink>
        <p className="text-small text-ink-muted">
          <span>{regions}</span>
          {", "}
          <time dateTime={dateTime} className="tabular whitespace-nowrap">
            {period}
          </time>
        </p>
      </div>
    </div>
  );
}
