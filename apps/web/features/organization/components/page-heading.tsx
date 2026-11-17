import type { ReactNode } from "react";
import { TopBarTitle } from "../../shell/components/top-bar-title";

/** Kopf einer Seite der Organisation: Titel in Kopfzeile und als h1, ein Satz darunter, optional eine Aktion. */
export function PageHeading({
  title,
  intro,
  action,
}: {
  title: string;
  intro?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <TopBarTitle title={title} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 text-h1 break-words">{title}</h1>
        {action}
      </div>
      {intro ? (
        <p className="max-w-reading text-body text-ink-muted">{intro}</p>
      ) : null}
    </div>
  );
}
