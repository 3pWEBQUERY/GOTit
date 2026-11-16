import type { ReactNode } from "react";

/** Ein Zustand einer Komponente auf der Testseite «Zeit»: Zwischentitel und Beispiel. */
export function TimeDemoBlock({ title, wide, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "flex min-w-0 flex-col gap-3" : "flex max-w-panel min-w-0 flex-col gap-3"}>
      <h3 className="text-h3">{title}</h3>
      {children}
    </div>
  );
}
