import { Check, CircleAlert, FileText, RotateCw, X } from "lucide-react";
import { Button } from "../actions/button";
import { IconButton } from "../actions/icon-button";

export type FileDropStatus = "queued" | "uploading" | "done" | "error";

export interface FileDropItemData {
  id: string;
  name: string;
  /** Fertig formatierte Grösse, zum Beispiel «2,4 MB». */
  sizeLabel?: string;
  status: FileDropStatus;
  /** Fortschritt 0 bis 100 im Zustand `uploading`. */
  progress?: number;
  /** Grund im Zustand `error`, in Klartext. */
  error?: string;
}

export interface FileDropItemLabels {
  queued: string;
  /** Text zum Fortschritt, zum Beispiel «40 % hochgeladen». */
  uploading: (percent: number) => string;
  done: string;
  retry: string;
  /** Zugänglicher Name des Entfernen-Buttons, mit Dateiname. */
  remove: (name: string) => string;
}

export interface FileDropItemProps {
  item: FileDropItemData;
  labels: FileDropItemLabels;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}

/** Eine Datei in der Liste von `FileDrop` mit ihrem Zustand als Icon und Text. */
export function FileDropItem({ item, labels, onRetry, onRemove }: FileDropItemProps) {
  const percent = Math.min(100, Math.max(0, Math.round(item.progress ?? 0)));
  return (
    <li className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
      <FileText aria-hidden strokeWidth={1.5} className="mt-3 size-5 shrink-0 text-ink-muted" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
        <p className="text-small font-[550] break-words text-ink">
          {item.name}
          {item.sizeLabel ? <span className="tabular font-normal text-ink-muted"> · {item.sizeLabel}</span> : null}
        </p>
        {item.status === "queued" ? <p className="text-small text-ink-muted">{labels.queued}</p> : null}
        {item.status === "uploading" ? (
          <>
            <progress
              value={percent}
              max={100}
              aria-label={item.name}
              className="h-1 w-full appearance-none overflow-hidden rounded-full bg-border [&::-moz-progress-bar]:bg-ink [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-ink"
            />
            <p className="tabular text-small text-ink-muted">{labels.uploading(percent)}</p>
          </>
        ) : null}
        {item.status === "done" ? (
          <p className="flex items-center gap-1 text-small text-success">
            <Check aria-hidden strokeWidth={1.5} className="size-[1.125rem] shrink-0" />
            <span>{labels.done}</span>
          </p>
        ) : null}
        {item.status === "error" ? (
          <>
            <p className="flex items-start gap-1 text-small text-error">
              <CircleAlert aria-hidden strokeWidth={1.5} className="mt-px size-[1.125rem] shrink-0" />
              <span>{item.error}</span>
            </p>
            {onRetry ? (
              <Button variant="secondary" icon={<RotateCw aria-hidden strokeWidth={1.5} />} onClick={() => onRetry(item.id)} className="self-start">
                {labels.retry}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
      {onRemove ? <IconButton label={labels.remove(item.name)} icon={<X strokeWidth={1.5} />} onClick={() => onRemove(item.id)} /> : null}
    </li>
  );
}
