"use client";

import {
  Button,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  UiLink,
  useToast,
} from "@app/ui";
import { ChevronDown, FolderPlus, Heart, LayoutList } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  setMembershipAction,
  type EntryActionResult,
} from "../actions/entries";
import type { ProfileFavoriteData } from "../queries/load-profile-favorite";
import { NewCollectionDialog } from "./collection-dialogs";
import { useFavorite } from "./use-favorite";

export interface ProfileFavoriteProps {
  slug: string;
  /** Null für Besucher: Das Herz führt dann zur Anmeldung und zurück. */
  data: ProfileFavoriteData | null;
  signInHref: string | null;
  favoritesHref: string;
}

/**
 * Herz und «Zu Sammlung hinzufügen» auf der Profilseite (PRD v2 9.3, 10).
 * Das Herz gilt «Favoriten»; das Menü listet die eigenen Sammlungen mit
 * Häkchen. Nicht für den Inhaber und nicht in der Studio-Vorschau.
 */
export function ProfileFavorite({
  slug,
  data,
  signInHref,
  favoritesHref,
}: ProfileFavoriteProps) {
  const t = useTranslations("favorites");
  const heart = useFavorite({
    slug,
    initial: data?.favorite ?? false,
    signInHref,
  });
  return (
    <div
      role="group"
      aria-label={t("profile.label")}
      className="flex flex-wrap items-center gap-2"
      data-profile-favorite
    >
      <Button
        aria-pressed={heart.pressed}
        disabled={heart.pending}
        onClick={() => heart.toggle(!heart.pressed)}
        icon={
          <Heart
            aria-hidden
            strokeWidth={1.5}
            fill={heart.pressed ? "currentColor" : "none"}
          />
        }
      >
        {t("profile.favorite")}
      </Button>
      {data ? (
        <CollectionMenu
          slug={slug}
          collections={data.collections}
          favoritesHref={favoritesHref}
        />
      ) : null}
    </div>
  );
}

function CollectionMenu({
  slug,
  collections,
  favoritesHref,
}: {
  slug: string;
  collections: ProfileFavoriteData["collections"];
  favoritesHref: string;
}) {
  const t = useTranslations("favorites");
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(
    collections,
    (current, change: { id: string; contains: boolean }) =>
      current.map((collection) =>
        collection.id === change.id
          ? { ...collection, contains: change.contains }
          : collection,
      ),
  );

  function report(result: EntryActionResult, name: string, member: boolean) {
    if (result.ok)
      toast({
        title: member
          ? t("entry.addedTo", { collection: name })
          : t("entry.removedFrom", { collection: name }),
        tone: "success",
      });
    else toast({ title: t(`entry.errors.${result.reason}`), tone: "error" });
  }

  function change(collection: { id: string; name: string }, member: boolean) {
    startTransition(async () => {
      setShown({ id: collection.id, contains: member });
      const result = await setMembershipAction(
        collection.id,
        slug,
        member,
      ).catch((): EntryActionResult => ({ ok: false, reason: "generic" }));
      report(result, collection.name, member);
      router.refresh();
    });
  }

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <Button
            icon={<ChevronDown aria-hidden strokeWidth={1.5} />}
            className="flex-row-reverse"
          >
            {t("profile.collections")}
          </Button>
        </MenuTrigger>
        <MenuContent align="start">
          {shown.length === 0 ? (
            <MenuLabel>{t("profile.noCollections")}</MenuLabel>
          ) : null}
          {shown.map((collection) => (
            <MenuCheckboxItem
              key={collection.id}
              checked={collection.contains}
              onCheckedChange={(checked) =>
                change(collection, checked === true)
              }
            >
              {collection.name}
            </MenuCheckboxItem>
          ))}
          <MenuSeparator />
          <MenuItem
            icon={<FolderPlus aria-hidden strokeWidth={1.5} />}
            onSelect={() => setCreating(true)}
          >
            {t("profile.newCollection")}
          </MenuItem>
          <MenuItem asChild>
            <UiLink href={favoritesHref}>
              <LayoutList aria-hidden strokeWidth={1.5} />
              <span className="min-w-0 flex-1">{t("profile.toFavorites")}</span>
            </UiLink>
          </MenuItem>
        </MenuContent>
      </Menu>
      <NewCollectionDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={async (created) => {
          const result = await setMembershipAction(
            created.id,
            slug,
            true,
          ).catch((): EntryActionResult => ({ ok: false, reason: "generic" }));
          if (result.ok)
            toast({
              title: t("collection.createdWith", { name: created.name }),
              tone: "success",
            });
          else report(result, created.name, true);
          router.refresh();
        }}
      />
    </>
  );
}
