"use client";

import { useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  moveEntryAction,
  removeEntryAction,
  setMembershipAction,
  type EntryActionResult,
} from "../actions/entries";
import type { EntryItem } from "../queries/load-collection";
import { NewCollectionDialog } from "./collection-dialogs";
import { EntryRow } from "./entry-row";

export interface EntryListProps {
  collection: { id: string; name: string };
  entries: readonly EntryItem[];
  /** Die anderen eigenen Sammlungen (ohne die aktuelle). */
  others: readonly { id: string; name: string }[];
  /** Slug → Ids der Sammlungen, in denen das Profil liegt. */
  membership: Record<string, string[]>;
}

type Failure = Extract<EntryActionResult, { ok: false }>["reason"];

/**
 * Die Einträge einer Sammlung, neueste oben (Entscheid 0013). Sortieren
 * wirkt sofort und wird angesagt; der Fokus bleibt am Menü des bewegten
 * Eintrags. Entfernen bietet «Rückgängig», solange das Profil erreichbar ist.
 */
export function EntryList({
  collection,
  entries,
  others,
  membership,
}: EntryListProps) {
  const t = useTranslations("favorites.entry");
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(entries);
  const [source, setSource] = useState(entries);
  const [announcement, setAnnouncement] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [newFor, setNewFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Neue Daten vom Server ersetzen den lokalen Stand.
  if (entries !== source) {
    setSource(entries);
    setItems(entries);
  }

  useEffect(() => {
    if (!focusId) return;
    document
      .querySelector<HTMLElement>(`[data-entry-menu="${focusId}"]`)
      ?.focus();
  }, [focusId, items]);

  function fail(reason: Failure) {
    toast({ title: t(`errors.${reason}`), tone: "error" });
    router.refresh();
  }

  function move(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    const entry = items[index];
    if (pending || !entry || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target] as EntryItem, entry];
    setItems(next);
    setFocusId(entry.id);
    const name = entry.state === "unavailable" ? t("unavailable") : entry.name;
    setAnnouncement(
      t("moved", { name, position: target + 1, total: items.length }),
    );
    startTransition(async () => {
      const result = await moveEntryAction(entry.id, direction).catch(
        (): EntryActionResult => ({ ok: false, reason: "generic" }),
      );
      if (!result.ok) fail(result.reason);
      else router.refresh();
    });
  }

  function remove(entry: EntryItem) {
    const index = items.findIndex((item) => item.id === entry.id);
    const neighbour = items[index + 1] ?? items[index - 1];
    setItems((current) => current.filter((item) => item.id !== entry.id));
    // Der Fokus geht zum Nachbarn, statt mit der Zeile zu verschwinden.
    setFocusId(neighbour?.id ?? null);
    startTransition(async () => {
      const result = await removeEntryAction(entry.id).catch(
        (): EntryActionResult => ({ ok: false, reason: "generic" }),
      );
      if (!result.ok) {
        fail(result.reason);
        return;
      }
      const slug = entry.state === "unavailable" ? null : entry.slug;
      toast({
        title: t("removed", { collection: collection.name }),
        tone: "success",
        ...(slug
          ? { action: { label: t("undo"), onAction: () => restore(slug) } }
          : {}),
      });
      router.refresh();
    });
  }

  function restore(slug: string) {
    startTransition(async () => {
      const result = await setMembershipAction(collection.id, slug, true).catch(
        (): EntryActionResult => ({ ok: false, reason: "generic" }),
      );
      if (!result.ok) fail(result.reason);
      else {
        toast({ title: t("restored"), tone: "success" });
        router.refresh();
      }
    });
  }

  function membershipChange(
    slug: string,
    target: { id: string; name: string },
    member: boolean,
  ) {
    startTransition(async () => {
      const result = await setMembershipAction(target.id, slug, member).catch(
        (): EntryActionResult => ({ ok: false, reason: "generic" }),
      );
      if (!result.ok) fail(result.reason);
      else {
        toast({
          title: member
            ? t("addedTo", { collection: target.name })
            : t("removedFrom", { collection: target.name }),
          tone: "success",
        });
        router.refresh();
      }
    });
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ul
        className="flex flex-col divide-y divide-border border-y border-border"
        data-entry-list
      >
        {items.map((entry, index) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            position={index + 1}
            total={items.length}
            others={
              entry.state === "unavailable"
                ? []
                : others.map((other) => ({
                    ...other,
                    member: membership[entry.slug]?.includes(other.id) ?? false,
                  }))
            }
            onMove={(direction) => move(index, direction)}
            onRemove={() => remove(entry)}
            onMembership={(collectionId, member) => {
              const target = others.find((other) => other.id === collectionId);
              if (target && entry.state !== "unavailable")
                membershipChange(entry.slug, target, member);
            }}
            onNewCollection={() => {
              if (entry.state !== "unavailable") setNewFor(entry.slug);
            }}
          />
        ))}
      </ul>
      <NewCollectionDialog
        open={newFor !== null}
        onOpenChange={(open) => {
          if (!open) setNewFor(null);
        }}
        onCreated={async (created) => {
          if (!newFor) return;
          const result = await setMembershipAction(
            created.id,
            newFor,
            true,
          ).catch((): EntryActionResult => ({ ok: false, reason: "generic" }));
          if (!result.ok) fail(result.reason);
          else
            toast({
              title: t("addedTo", { collection: created.name }),
              tone: "success",
            });
          router.refresh();
        }}
      />
    </>
  );
}
