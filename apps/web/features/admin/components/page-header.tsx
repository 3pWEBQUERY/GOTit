import { Breadcrumbs, type Crumb } from "@app/ui";

/** Kopf einer Admin-Seite: Breadcrumbs ab der zweiten Ebene, Titel, optional ein Satz. */
export function AdminPageHeader({ title, intro, crumbs, crumbsLabel }: { title: string; intro?: string; crumbs?: readonly Crumb[]; crumbsLabel?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {crumbs && crumbsLabel ? <Breadcrumbs label={crumbsLabel} items={crumbs} /> : null}
      <h1 className="text-h1">{title}</h1>
      {intro ? <p className="max-w-prose text-body text-ink-muted">{intro}</p> : null}
    </div>
  );
}
