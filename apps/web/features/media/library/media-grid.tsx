"use client";

import { EmptyState, useToast } from "@app/ui";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { makeCover, makeLogo, moveMedia, reorderMedia } from "../actions/arrange";
import { DeleteMediaDialog } from "./delete-media-dialog";
import { MediaTile } from "./media-tile";
import { moveStep, moveTo } from "./reorder";
import { SelectionBar } from "./selection-bar";
import { scopeInput, type LibraryItem, type MediaScope } from "./types";

function signature(items: readonly LibraryItem[]): string {
  return items.map((item) => `${item.id}:${item.status}:${item.visibility}:${item.isCover}:${item.isLogo}`).join("|");
}

/**
 * Raster der eigenen Medien mit Drag-and-drop, Mehrfachauswahl und Menü pro
 * Medium (PRD v2 11.3). Änderungen der Reihenfolge erscheinen sofort und
 * werden gespeichert; schlägt das fehl, gilt wieder die gespeicherte.
 * `readOnly` zeigt die Medien einer Organisation ohne Recht «media.edit»: kein
 * Ziehen, keine Auswahl, kein Menü.
 */
export function MediaGrid({ items, scope, readOnly = false }: { items: readonly LibraryItem[]; scope: MediaScope; readOnly?: boolean }) {
  const t = useTranslations("media.library");
  const router = useRouter();
  const { toast } = useToast();
  const [synced, setSynced] = useState(() => signature(items));
  const [order, setOrder] = useState(() => items.map((item) => item.id));
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<readonly string[]>([]);
  const [announcement, setAnnouncement] = useState("");

  // Neuer Stand vom Server (nach Upload, Verarbeitung oder Speichern) ersetzt die lokale Reihenfolge.
  if (signature(items) !== synced) {
    setSynced(signature(items));
    setOrder(items.map((item) => item.id));
    setSelected((current) => new Set([...current].filter((id) => items.some((item) => item.id === id))));
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = order.flatMap((id) => byId.get(id) ?? []);

  async function save(next: string[], run: () => Promise<{ ok: boolean }>, movedId: string) {
    const previous = order;
    setOrder(next);
    setAnnouncement(t("moved", { position: previous.indexOf(movedId) + 1, target: next.indexOf(movedId) + 1 }));
    const result = await run().catch(() => ({ ok: false }));
    if (!result.ok) {
      setOrder(previous);
      toast({ title: t("saveError"), tone: "error" });
      return;
    }
    router.refresh();
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-media-menu="${movedId}"]`)?.focus());
  }

  function drop(targetId: string) {
    const id = dragId;
    setDragId(null);
    setOverId(null);
    if (!id || id === targetId) return;
    const next = moveTo(order, id, targetId);
    void save(next, () => reorderMedia({ order: next, ...scopeInput(scope) }), id);
  }

  async function cover(id: string, kind: "cover" | "logo" = "cover") {
    const result = await (kind === "logo" ? makeLogo : makeCover)({ mediaId: id, ...scopeInput(scope) }).catch(() => ({ ok: false }));
    if (!result.ok) toast({ title: t("actionError"), tone: "error" });
    else router.refresh();
  }

  if (ordered.length === 0) {
    return <EmptyState icon={<ImageIcon strokeWidth={1.5} />} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {readOnly ? null : (
        <>
          <p className="text-small text-ink-muted">{t("dragHint")}</p>
          <SelectionBar
            selected={[...selected]}
            scope={scope}
            onClear={() => setSelected(new Set())}
            onDelete={() => setToDelete([...selected])}
            onChanged={() => router.refresh()}
          />
        </>
      )}
      <ul aria-label={t("gridLabel")} className="grid grid-cols-2 gap-3 xs:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-media-grid>
        {ordered.map((item, index) => (
          <MediaTile
            key={item.id}
            item={item}
            position={index + 1}
            total={ordered.length}
            selected={selected.has(item.id)}
            dragging={dragId === item.id}
            dropTarget={overId === item.id && dragId !== item.id}
            readOnly={readOnly}
            organization={scope.kind === "organization"}
            onSelect={(value) =>
              setSelected((current) => {
                const next = new Set(current);
                if (value) next.add(item.id);
                else next.delete(item.id);
                return next;
              })
            }
            onMove={(direction) => {
              const next = moveStep(order, item.id, direction);
              void save(next, () => moveMedia({ mediaId: item.id, direction, ...scopeInput(scope) }), item.id);
            }}
            onCover={() => void cover(item.id)}
            onLogo={() => void cover(item.id, "logo")}
            onDelete={() => setToDelete([item.id])}
            onDragStart={() => setDragId(item.id)}
            onDragOver={(event) => {
              if (!dragId) return;
              event.preventDefault();
              if (overId !== item.id) setOverId(item.id);
            }}
            onDrop={() => drop(item.id)}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
          />
        ))}
      </ul>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <DeleteMediaDialog
        mediaIds={toDelete}
        scope={scope}
        open={toDelete.length > 0}
        onOpenChange={(open) => {
          if (!open) setToDelete([]);
        }}
        onDeleted={(count) => {
          toast({ title: t("deleted", { count }), tone: "success" });
          setSelected(new Set());
          setToDelete([]);
          router.refresh();
        }}
      />
    </div>
  );
}
