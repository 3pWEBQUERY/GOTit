import type { ReactNode } from "react";

/** Ein Zustand einer Komponente auf der Testseite «Eingabe»: Zwischentitel und Beispiel. */
export function InputDemoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex max-w-panel flex-col gap-3">
      <h3 className="text-h3">{title}</h3>
      {children}
    </div>
  );
}
