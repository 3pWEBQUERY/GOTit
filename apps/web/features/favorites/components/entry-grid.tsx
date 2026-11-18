"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { EntryItem } from "../queries/load-collection";
import { NewCollectionDialog } from "./collection-dialogs";
import { EntryCard } from "./entry-card";
import { MoveDialog } from "./move-dialog";
import { SelectionBar } from "./selection-bar";
import { useEntryActions } from "./use-entry-actions";

export interface EntryGridProps {
  collection: { id: string; name: string };
  /** Id der Standardsammlung «Favoriten»: Ihr gilt das Herz auf den Karten. */
  defaultId: string;
  entries: readonly EntryItem[];
  /** Die anderen eigenen Sammlungen (ohne die aktuelle). */
  others: readonly { id: string; name: string }[];
  /** Slug → Ids der Sammlungen, in denen das Profil liegt. */
  membership: Record<string, string[]>;
}

/**
 * Die Einträge einer Sammlung als ProfileCard-Raster (PRD v2 12.1), neueste
 * vorne. «Nach vorne» und «Nach hinten» wirken sofort und werden angesagt;
 * der Fokus bleibt am Menü. Mehrfachauswahl mit «In Sammlung verschieben»
 * und «Entfernen» (mit «Rückgängig»).
 */
export function EntryGrid({
  collection,
  defaultId,
  entries,
  others,
  membership,
}: EntryGridProps) {
  const t = useTranslations("favorites.entry");
  const actions = useEntryActions(collection.name);
  const [items, setItems] = useState(entries);
  const [source, setSource] = useState(entries);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [moving, setMoving] = useState<string[]>([]);
  const [newFor, setNewFor] = useState<string | null>(null);

  // Neue Daten vom Server ersetzen den lokalen Stand; die Auswahl behält nur, was es noch gibt.
  if (entries !== source) {
    setSource(entries);
    setItems(entries);
    setSelected(
      (current) =>
        new Set(
          [...current].filter((id) => entries.some((entry) => entry.id === id)),
        ),
    );
  }

  useEffect(() => {
    if (!focusId) return;
    const target =
      document.querySelector<HTMLElement>(`[data-entry-menu="${focusId}"]`) ??
      document.querySelector<HTMLElement>("[data-selection-toggle]");
    target?.focus();
  }, [focusId, items]);

  function move(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    const entry = items[index];
    if (!entry || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target] as EntryItem, entry];
    setItems(next);
    setFocusId(entry.id);
    const name = entry.state === "unavailable" ? t("unavailable") : entry.name;
    setAnnouncement(
      t("moved", { name, position: target + 1, total: items.length }),
    );
    actions.move(entry.id, direction);
  }

  function remove(ids: string[]) {
    const index = items.findIndex((item) => ids.includes(item.id));
    const neighbour =
      items.slice(index).find((item) => !ids.includes(item.id)) ??
      items
        .slice(0, index)
        .reverse()
        .find((item) => !ids.includes(item.id));
    const restorable = items.some(
      (item) => ids.includes(item.id) && item.state !== "unavailable",
    );
    actions.remove(ids, restorable, () => {
      setItems((current) => current.filter((item) => !ids.includes(item.id)));
      setSelected(new Set());
      // Der Fokus geht zum Nachbarn, statt mit der Karte zu verschwinden.
      setFocusId(neighbour?.id ?? "auswahl");
    });
  }

  function select(id: string, value: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SelectionBar
        selected={selected.size}
        total={items.length}
        canMove={others.length > 0}
        onSelectAll={() => setSelected(new Set(items.map((item) => item.id)))}
        onClear={() => setSelected(new Set())}
        onMove={() => setMoving([...selected])}
        onRemove={() => remove([...selected])}
      />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ul
        aria-label={collection.name}
        className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4"
        data-entry-grid
      >
        {items.map((entry, index) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            position={index + 1}
            total={items.length}
            selected={selected.has(entry.id)}
            favorite={
              entry.state !== "unavailable" &&
              (collection.id === defaultId ||
                (membership[entry.slug]?.includes(defaultId) ?? false))
            }
            others={
              entry.state === "unavailable"
                ? []
                : others.map((other) => ({
                    ...other,
                    member: membership[entry.slug]?.includes(other.id) ?? false,
                  }))
            }
            onSelect={(value) => select(entry.id, value)}
            onMove={(direction) => move(index, direction)}
            onMoveTo={() => setMoving([entry.id])}
            onRemove={() => remove([entry.id])}
            onMembership={(collectionId, member) => {
              const target = others.find((other) => other.id === collectionId);
              if (target && entry.state !== "unavailable")
                actions.membership(entry.slug, target, member);
            }}
            onNewCollection={() => {
              if (entry.state !== "unavailable") setNewFor(entry.slug);
            }}
          />
        ))}
      </ul>
      <MoveDialog
        count={moving.length}
        targets={others}
        onClose={() => setMoving([])}
        onMove={async (targetId) => {
          const target = others.find((other) => other.id === targetId);
          if (!target) return null;
          const error = await actions.moveTo(moving, target);
          if (!error) {
            setItems((current) =>
              current.filter((item) => !moving.includes(item.id)),
            );
            setSelected(new Set());
            setMoving([]);
            setFocusId("auswahl");
          }
          return error;
        }}
      />
      <NewCollectionDialog
        open={newFor !== null}
        onOpenChange={(open) => {
          if (!open) setNewFor(null);
        }}
        onCreated={async (created) => {
          if (newFor) await actions.addToNew(newFor, created);
        }}
      />
    </div>
  );
}
