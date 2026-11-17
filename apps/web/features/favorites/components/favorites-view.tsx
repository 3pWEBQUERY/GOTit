import {
  MAX_ITEMS_PER_COLLECTION,
  type CollectionSummary,
} from "@app/core/favorites";
import type { Locale } from "@app/core/locale";
import { EmptyState, InlineAlert, UiLink, buttonVariants } from "@app/ui";
import { FolderHeart, Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireAccount } from "../../account/require-account";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import { createHref } from "../../shell/nav/href";
import { loadCollectionPage } from "../queries/load-collection";
import { CollectionTabs } from "./collection-tabs";
import {
  NewCollectionDialog,
  RenameCollectionDialog,
} from "./collection-dialogs";
import { DeleteCollectionButton } from "./delete-collection-button";
import { EntryGrid } from "./entry-grid";

/**
 * `/favoriten` (Standardsammlung, `collectionId` null) und
 * `/favoriten/[sammlung]` (PRD v1 5.6, v2 7.5 und 12.1). Eine fremde oder
 * unbekannte Sammlung ergibt eine echte 404.
 */
export async function FavoritesView({
  locale,
  collectionId,
}: {
  locale: Locale;
  collectionId: string | null;
}) {
  const viewer = await requireAccount(locale);
  const data = await loadCollectionPage(viewer, locale, collectionId);
  if (!data) notFound();
  const t = await getTranslations({ locale, namespace: "favorites" });
  const href = createHref(locale);
  const nameOf = (collection: CollectionSummary) =>
    collection.isDefault ? t("page.defaultName") : collection.name;
  const { current } = data;
  const defaultId =
    data.collections.find((collection) => collection.isDefault)?.id ??
    current.id;
  const title = nameOf(current);
  const tabs = data.collections.map((collection) => ({
    id: collection.id,
    name: nameOf(collection),
    count: collection.count,
    current: collection.id === current.id,
    href: collection.isDefault
      ? href("/favoriten")
      : href({
          pathname: "/favoriten/[sammlung]",
          params: { sammlung: collection.id },
        }),
  }));
  const others = data.collections
    .filter((collection) => collection.id !== current.id)
    .map((collection) => ({ id: collection.id, name: nameOf(collection) }));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <TopBarTitle title={title} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 break-words">{title}</h1>
        <p className="tabular text-small text-ink-muted">
          {t("page.count", { count: current.count })}
        </p>
        {current.isDefault ? (
          <p className="max-w-prose text-body text-ink-muted">
            {t("page.intro")}
          </p>
        ) : null}
      </header>
      <CollectionTabs
        label={t("page.collectionsLabel")}
        tabs={tabs}
        action={<NewCollectionDialog />}
      />
      {current.isDefault ? null : (
        <div className="flex flex-wrap gap-2">
          <RenameCollectionDialog
            collection={{ id: current.id, name: current.name }}
          />
          <DeleteCollectionButton
            collection={{
              id: current.id,
              name: current.name,
              count: current.count,
            }}
          />
        </div>
      )}
      {current.count >= MAX_ITEMS_PER_COLLECTION ? (
        <InlineAlert
          tone="info"
          title={t("page.full", { max: MAX_ITEMS_PER_COLLECTION })}
        />
      ) : null}
      {data.entries.length === 0 ? (
        <EmptyState
          icon={
            current.isDefault ? (
              <Heart strokeWidth={1.5} />
            ) : (
              <FolderHeart strokeWidth={1.5} />
            )
          }
          title={
            current.isDefault
              ? t("page.emptyTitle")
              : t("page.emptyCollectionTitle")
          }
          description={
            current.isDefault
              ? t("page.emptyText")
              : t("page.emptyCollectionText")
          }
          action={
            <UiLink
              href={current.isDefault ? href("/") : href("/favoriten")}
              className={buttonVariants({ variant: "primary" })}
            >
              {current.isDefault
                ? t("page.emptyAction")
                : t("page.emptyCollectionAction")}
            </UiLink>
          }
          className="py-4"
        />
      ) : (
        <EntryGrid
          collection={{ id: current.id, name: title }}
          defaultId={defaultId}
          entries={data.entries}
          others={others}
          membership={data.membership}
        />
      )}
    </div>
  );
}
