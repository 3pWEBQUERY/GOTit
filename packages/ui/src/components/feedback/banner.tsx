import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import { IconButton } from "../actions/icon-button";
import { ToneIcon } from "./tone-icon";

interface BannerBaseProps {
  tone?: "info" | "success" | "warning" | "error";
  /** Der Hinweis in einem Satz. */
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export type BannerProps = BannerBaseProps &
  (
    | { onClose: () => void; /** Zugänglicher Name des Schliessen-Buttons. */ closeLabel: string }
    | { onClose?: undefined; closeLabel?: undefined }
  );

/**
 * Seitenbreiter Hinweis, der die ganze Ansicht betrifft (Verbindungsverlust,
 * Wartung). Die Ansicht entscheidet, ob er sichtbar ist; `onClose` meldet nur den Wunsch.
 */
export function Banner({ tone = "info", children, action, onClose, closeLabel, className }: BannerProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex w-full items-start gap-3 border-b border-border bg-surface-2 px-4 py-2 text-ink md:px-6", className)}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex min-h-11 min-w-0 flex-1 basis-48 items-center gap-3 py-2">
          <ToneIcon tone={tone} className="self-start" />
          <p className="min-w-0 text-small">{children}</p>
        </div>
        {action}
      </div>
      {onClose ? <IconButton label={closeLabel} icon={<X strokeWidth={1.5} />} onClick={onClose} /> : null}
    </div>
  );
}
