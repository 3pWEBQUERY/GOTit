"use client";

import { useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import {
  moveEntriesAction,
  removeEntriesAction,
  restoreEntriesAction,
  type BulkFailure,
} from "../actions/bulk";
import {
  moveEntryAction,
  setMembershipAction,
  type EntryActionResult,
} from "../actions/entries";

type Failure =
  | BulkFailure
  | Extract<EntryActionResult, { ok: false }>["reason"];

/**
 * Serveraufrufe der Einträge einer Sammlung mit Rückmeldung: Erfolg im Toast,
 * Entfernen mit «Rückgängig» (8 Sekunden, PRD 13), Fehler im Toast und
 * danach der gespeicherte Stand.
 */
export function useEntryActions(collectionName: string) {
  const t = useTranslations("favorites.entry");
  const tMove = useTranslations("favorites.moveDialog");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function fail(reason: Failure) {
    toast({ title: t(`errors.${reason}`), tone: "error" });
    router.refresh();
  }

  const generic = (): { ok: false; reason: "generic" } => ({
    ok: false,
    reason: "generic",
  });

  // Verschieben läuft nacheinander: Ein zweiter Klick, während der erste noch
  // speichert, geht nicht verloren, sondern wartet. Neu geladen wird erst nach
  // dem letzten Schritt, damit der gespeicherte Stand die Anzeige nicht
  // zwischendurch zurücksetzt.
  const moves = useRef<{ chain: Promise<void>; open: number }>({
    chain: Promise.resolve(),
    open: 0,
  });

  function move(favoriteId: string, direction: "up" | "down") {
    const queue = moves.current;
    queue.open += 1;
    queue.chain = queue.chain.then(async () => {
      const result = await moveEntryAction(favoriteId, direction).catch(
        generic,
      );
      queue.open -= 1;
      if (!result.ok) {
        // Fehler im Toast, danach der gespeicherte Stand (fail lädt neu).
        fail(result.reason);
        return;
      }
      if (queue.open === 0) startTransition(() => router.refresh());
    });
  }

  function remove(
    favoriteIds: string[],
    restorable: boolean,
    onDone: () => void,
  ) {
    startTransition(async () => {
      const result = await removeEntriesAction(favoriteIds).catch(generic);
      if (!result.ok) {
        fail(result.reason);
        return;
      }
      onDone();
      const removed = result.removed;
      toast({
        title:
          favoriteIds.length === 1
            ? t("removed", { collection: collectionName })
            : t("removedMany", {
                count: removed.length,
                collection: collectionName,
              }),
        tone: "success",
        // «Rückgängig» nur, wenn sich etwas zurücklegen lässt: Nicht mehr verfügbare Profile lassen sich nicht mehr merken.
        ...(restorable
          ? { action: { label: t("undo"), onAction: () => restore(removed) } }
          : {}),
      });
      router.refresh();
    });
  }

  function restore(removed: unknown) {
    startTransition(async () => {
      const result = await restoreEntriesAction(removed).catch(generic);
      if (!result.ok) fail(result.reason);
      else {
        toast({
          title: result.restored > 0 ? t("restored") : t("notRestored"),
          tone: result.restored > 0 ? "success" : "error",
        });
        router.refresh();
      }
    });
  }

  /** Verschiebt und gibt bei einem Fehler den Text für den Dialog zurück. */
  async function moveTo(
    favoriteIds: string[],
    target: { id: string; name: string },
  ): Promise<string | null> {
    const result = await moveEntriesAction(favoriteIds, target.id).catch(
      generic,
    );
    if (!result.ok)
      return result.reason === "limit"
        ? tMove("limit")
        : t(`errors.${result.reason}`);
    toast({
      title: t("movedTo", { count: result.moved, collection: target.name }),
      tone: "success",
    });
    router.refresh();
    return null;
  }

  function membership(
    slug: string,
    target: { id: string; name: string },
    member: boolean,
  ) {
    startTransition(async () => {
      const result = await setMembershipAction(target.id, slug, member).catch(
        generic,
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

  async function addToNew(slug: string, created: { id: string; name: string }) {
    const result = await setMembershipAction(created.id, slug, true).catch(
      generic,
    );
    if (!result.ok) fail(result.reason);
    else
      toast({
        title: t("addedTo", { collection: created.name }),
        tone: "success",
      });
    router.refresh();
  }

  return { pending, move, remove, moveTo, membership, addToNew };
}
