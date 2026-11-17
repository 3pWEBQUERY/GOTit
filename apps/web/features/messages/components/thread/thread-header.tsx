"use client";

import {
  IconButton,
  SidePanel,
  SidePanelContent,
  Sheet,
  SheetContent,
  cn,
} from "@app/ui";
import { Archive, ArchiveRestore, Info, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { setStarredAction } from "../../actions/thread";

function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

export interface ThreadHeaderProps {
  headingId: string;
  conversationId: string;
  name: string;
  starred: boolean;
  archived: boolean;
  onArchive: (archived: boolean) => void;
  /** Klassen, unter denen «Details» erscheint, weil die Kontextspalte fehlt. */
  detailsClassName: string;
  context: ReactNode;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
}

/**
 * Kopf der Unterhaltung: Name, Favorit, Archivieren und, wo die Kontextspalte
 * fehlt, «Details» als Sheet (mobil, PRD v2 11.4) oder Seitenpanel.
 */
export function ThreadHeader({
  headingId,
  conversationId,
  name,
  starred,
  archived,
  onArchive,
  detailsClassName,
  context,
  detailsOpen,
  onDetailsOpenChange: setDetailsOpen,
}: ThreadHeaderProps) {
  const t = useTranslations("messages.thread");
  const tContext = useTranslations("messages.context");
  const router = useRouter();
  const [shownStarred, setShownStarred] = useOptimistic(starred);
  const [, startTransition] = useTransition();
  const wide = useWide();

  function toggleStar() {
    const next = !shownStarred;
    startTransition(async () => {
      setShownStarred(next);
      await setStarredAction(conversationId, next).catch(() => false);
      router.refresh();
    });
  }

  return (
    <header className="flex min-w-0 items-center gap-1 border-b border-border pb-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 id={headingId} className="truncate text-h3">
          {name}
        </h2>
        {archived ? (
          <p className="text-small text-ink-muted">{t("archivedNote")}</p>
        ) : null}
      </div>
      <IconButton
        label={t("star")}
        aria-pressed={shownStarred}
        icon={
          <Star
            strokeWidth={1.5}
            fill={shownStarred ? "currentColor" : "none"}
          />
        }
        onClick={toggleStar}
      />
      <IconButton
        label={archived ? t("unarchive") : t("archive")}
        icon={
          archived ? (
            <ArchiveRestore strokeWidth={1.5} />
          ) : (
            <Archive strokeWidth={1.5} />
          )
        }
        onClick={() => onArchive(!archived)}
      />
      <IconButton
        label={t("details")}
        icon={<Info strokeWidth={1.5} />}
        onClick={() => setDetailsOpen(true)}
        className={cn(detailsClassName)}
      />
      {wide ? (
        <SidePanel open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SidePanelContent
            title={tContext("title")}
            closeLabel={tContext("close")}
          >
            {context}
          </SidePanelContent>
        </SidePanel>
      ) : (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent
            title={tContext("title")}
            closeLabel={tContext("close")}
            handleLabel={tContext("handle")}
            defaultDetent="full"
          >
            {context}
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}
