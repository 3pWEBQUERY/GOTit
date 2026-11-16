import type { ReactNode } from "react";
import { cn } from "../../cn";
import { ToneIcon } from "./tone-icon";

export interface InlineAlertProps {
  tone?: "info" | "success" | "warning" | "error";
  title: ReactNode;
  /** Der erklärende Text unter dem Titel. */
  children?: ReactNode;
  /** Eine Aktion, zum Beispiel ein stiller Button. */
  action?: ReactNode;
  className?: string;
}

/** Hinweis am Ort seines Entstehens. Fehler werden sofort vorgelesen, alles andere höflich. */
export function InlineAlert({ tone = "info", title, children, action, className }: InlineAlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-control border border-border bg-surface-2 p-4 text-ink", className)}
    >
      <ToneIcon tone={tone} className="mt-px" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-small font-[550]">{title}</p>
        {children ? <div className="text-small text-ink-muted">{children}</div> : null}
        {action ? <div className="mt-2 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
