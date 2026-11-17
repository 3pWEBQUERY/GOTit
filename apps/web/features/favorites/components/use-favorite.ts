"use client";

import { useToast } from "@app/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { setFavoriteAction } from "../actions/set-favorite";

export interface FavoriteState {
  pressed: boolean;
  pending: boolean;
  toggle: (next: boolean) => void;
}

/**
 * Zustand eines Herzens mit sofortiger Rückmeldung. Schlägt das Speichern
 * fehl, springt das Herz zurück und eine Meldung nennt den Grund. Besucher
 * führt das Herz zur Anmeldung und danach zurück.
 */
export function useFavorite({
  slug,
  initial,
  signInHref,
}: {
  slug: string;
  initial: boolean;
  signInHref: string | null;
}): FavoriteState {
  const t = useTranslations("favorites.toggle");
  const { toast } = useToast();
  const router = useRouter();
  const [pressed, setOptimistic] = useOptimistic(initial);
  const [pending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    if (signInHref) {
      router.push(signInHref);
      return;
    }
    startTransition(async () => {
      setOptimistic(next);
      const result = await setFavoriteAction(slug, next);
      if (result.ok) {
        toast({ title: next ? t("added") : t("removed"), tone: "success" });
        router.refresh();
        return;
      }
      if (result.reason === "sign-in") router.push(signInHref ?? "/");
      else toast({ title: t(`errors.${result.reason}`), tone: "error" });
    });
  };
  return { pressed, pending, toggle };
}
