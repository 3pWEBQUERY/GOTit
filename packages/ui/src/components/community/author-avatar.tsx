import { cn } from "../../cn";

export interface CommunityAuthor {
  name: string;
  /** Link zum Profil des Autors. */
  href?: string;
  /** Initialen für die neutrale Fläche, wenn kein Bild vorliegt. */
  initials: string;
  avatarSrc?: string;
}

const sizeClasses = {
  sm: "size-8 text-label",
  md: "size-11 text-small",
  lg: "size-16 text-body",
} as const;

export interface AuthorAvatarProps {
  initials: string;
  src?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

/** Rundes Bild oder neutrale Fläche mit Initialen. Dekorativ: Der Name steht immer daneben. */
export function AuthorAvatar({ initials, src, size = "md", className }: AuthorAvatarProps) {
  const classes = cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-[550] text-ink-muted", sizeClasses[size], className);
  if (src) {
    return (
      <span aria-hidden className={classes}>
        <img src={src} alt="" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span aria-hidden className={classes}>
      {initials}
    </span>
  );
}
