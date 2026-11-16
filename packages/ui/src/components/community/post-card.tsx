"use client";

import { Bookmark, Ellipsis, Flag, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { Button } from "../actions/button";
import { IconButton } from "../actions/icon-button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../actions/menu";
import { Skeleton } from "../feedback/skeleton";
import { AuthorAvatar, type CommunityAuthor } from "./author-avatar";

export type PostImageRatio = "16:9" | "4:5";

export interface PostCardImage {
  src: string;
  alt: string;
  ratio?: PostImageRatio;
}

export interface PostCardLabels {
  /** Kommentare mit Anzahl als Text, zum Beispiel «3 Kommentare». */
  comments: string;
  /** Zum Beispiel «Speichern». Der Zustand steht in `aria-pressed`. */
  save: string;
  /** Zugänglicher Name des Menüs, zum Beispiel «Weitere Aktionen». */
  menu: string;
  /** Zum Beispiel «Beitrag melden». */
  report: string;
}

export interface PostCardProps {
  author: CommunityAuthor & { href: string };
  /** Zeit als Text, zum Beispiel «vor 3 Stunden». */
  time: string;
  /** Genaues Datum für den Tooltip, zum Beispiel «16.11.2026, 09:12». */
  exactTime: string;
  dateTime?: string;
  region?: string;
  /** Text des Beitrags. */
  children: ReactNode;
  /** Höchstens ein Bild. */
  image?: PostCardImage;
  /** Eigene Bildkomponente der App (oder eine neutrale Fläche) statt `image`; füllt den Rahmen im gewählten Verhältnis. */
  imageSlot?: ReactNode;
  imageRatio?: PostImageRatio;
  labels: PostCardLabels;
  /** Mit `commentsHref` führen die Kommentare zur Beitragsseite, sonst meldet `onCommentsSelect` den Klick. */
  commentsHref?: string;
  onCommentsSelect?: () => void;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  onReport: () => void;
  /** Weitere Menüeinträge (`MenuItem`) vor «Melden». */
  menuItems?: ReactNode;
  /** Kennzeichnet einen bezahlten Beitrag mit dem Wort «Anzeige». */
  sponsoredLabel?: string;
  /** Moderationsstatus, den nur der Autor sieht, zum Beispiel «In Prüfung». */
  moderation?: { label: string };
  className?: string;
}

const ratioClasses: Record<PostImageRatio, string> = { "16:9": "aspect-video", "4:5": "aspect-4/5 max-w-panel" };

const tagClasses = "inline-flex items-center rounded-chip border border-border bg-surface px-2 py-1 text-label text-ink";

/**
 * Beitrag im Feed (PRD 12.3). Reaktionen sind «Kommentieren» und «Speichern»; es gibt keine
 * Like-Zähler. Karten trennen sich durch eine Linie, nicht durch Schatten. «Anzeige» ist neutral beschriftet.
 */
export function PostCard({ author, time, exactTime, dateTime, region, children, image, imageSlot, imageRatio, labels, commentsHref, onCommentsSelect, saved = false, onSavedChange, onReport, menuItems, sponsoredLabel, moderation, className }: PostCardProps) {
  const ratio = image?.ratio ?? imageRatio ?? "16:9";
  const commentsIcon = <MessageSquare aria-hidden strokeWidth={1.5} />;
  return (
    <article className={cn("flex flex-col gap-3 border-b border-border py-6", className)}>
      <header className="flex items-start gap-3">
        <AuthorAvatar initials={author.initials} src={author.avatarSrc} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <UiLink href={author.href} className="inline-flex min-h-6 items-center text-body font-[600] text-ink underline-offset-4 hover:underline">
              {author.name}
            </UiLink>
            {sponsoredLabel ? <span className={tagClasses}>{sponsoredLabel}</span> : null}
            {moderation ? <span className={cn(tagClasses, "border-dashed text-ink-muted")}>{moderation.label}</span> : null}
          </div>
          <p className="text-small text-ink-muted">
            <time dateTime={dateTime} title={exactTime}>
              {time}
            </time>
            {region ? (
              <>
                <span aria-hidden> · </span>
                <span>{region}</span>
              </>
            ) : null}
          </p>
        </div>
        <Menu>
          <MenuTrigger asChild>
            <IconButton label={labels.menu} icon={<Ellipsis strokeWidth={1.5} />} className="-mt-2 -mr-2" />
          </MenuTrigger>
          <MenuContent align="end">
            {menuItems}
            <MenuItem icon={<Flag aria-hidden strokeWidth={1.5} />} onSelect={onReport}>
              {labels.report}
            </MenuItem>
          </MenuContent>
        </Menu>
      </header>
      <div className="max-w-prose text-body whitespace-pre-line text-ink">{children}</div>
      {image || imageSlot ? (
        <div className={cn("w-full overflow-hidden rounded-card bg-surface-2", ratioClasses[ratio])}>{imageSlot ?? (image ? <img src={image.src} alt={image.alt} loading="lazy" className="size-full object-cover" /> : null)}</div>
      ) : null}
      <footer className="-ml-3 flex flex-wrap items-center gap-1">
        {commentsHref ? (
          <Button asChild variant="quiet">
            <UiLink href={commentsHref}>
              {commentsIcon}
              <span>{labels.comments}</span>
            </UiLink>
          </Button>
        ) : (
          <Button variant="quiet" icon={commentsIcon} onClick={onCommentsSelect}>
            {labels.comments}
          </Button>
        )}
        <Button
          variant="quiet"
          aria-pressed={saved}
          icon={<Bookmark aria-hidden strokeWidth={1.5} className={saved ? "fill-current" : undefined} />}
          onClick={() => onSavedChange?.(!saved)}
        >
          {labels.save}
        </Button>
      </footer>
    </article>
  );
}

/** Skelett eines Beitrags in der Form von `PostCard`. Dekorativ; den Ladezustand meldet `LoadingRegion`. */
export function PostCardSkeleton({ withImage, className }: { withImage?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-3 border-b border-border py-6", className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" />
        <Skeleton lines={2} className="max-w-48" />
      </div>
      <Skeleton lines={3} className="max-w-prose" />
      {withImage ? <Skeleton variant="block" className="aspect-video h-auto" /> : null}
    </div>
  );
}
