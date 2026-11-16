import { TopBarTitle } from "../../shell/components/top-bar-title";

/** Kopf eines Abschnitts: Titel als h1 (die Navigation trägt keinen Titel), ein Satz dazu. */
export function SettingsHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="flex flex-col gap-2">
      <TopBarTitle title={title} />
      <h1 className="text-h1">{title}</h1>
      <p className="max-w-prose text-body text-ink-muted">{intro}</p>
    </header>
  );
}
