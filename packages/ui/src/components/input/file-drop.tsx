"use client";

import { Upload } from "lucide-react";
import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { FieldMessage } from "./field-message";
import { FileDropItem, type FileDropItemData, type FileDropItemLabels } from "./file-drop-item";

/** Warum eine Datei nicht angenommen wurde: falscher Typ, zu gross oder mehr als eine Datei ohne `multiple`. */
export type FileRejectReason = "type" | "size" | "count";

export interface FileDropLabels extends FileDropItemLabels {
  /** Beschriftung des Buttons, zum Beispiel «Dateien wählen». */
  choose: string;
}

export interface FileDropProps {
  label: ReactNode;
  /** Satz in der Ablagefläche, zum Beispiel «Zieh Dateien hierher oder wähle sie aus.» */
  dropHint?: ReactNode;
  /** Erlaubte Formate und Grösse in Klartext. */
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  labels: FileDropLabels;
  /** Wie das native Attribut: `.pdf`, `image/*`, `image/jpeg`, durch Komma getrennt. */
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  /** Die Dateiliste ist kontrolliert; die Komponente lädt selbst nichts hoch. */
  items: readonly FileDropItemData[];
  onFilesSelected: (files: File[]) => void;
  onReject?: (file: File, reason: FileRejectReason) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

function matchesAccept(file: File, accept: string | undefined): boolean {
  const rules = (accept ?? "")
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

/**
 * Ablagefläche mit Button zum Wählen von Dateien und einer Liste mit dem Zustand
 * jeder Datei. Typ und Grösse werden geprüft; Abgelehntes meldet `onReject`.
 */
export function FileDrop({ label, dropHint, hint, error, optionalLabel, labels, accept, multiple, maxSizeBytes, items, onFilesSelected, onReject, onRetry, onRemove, disabled, className }: FileDropProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const receive = (files: File[]) => {
    const accepted: File[] = [];
    for (const file of files) {
      if (!matchesAccept(file, accept)) onReject?.(file, "type");
      else if (maxSizeBytes !== undefined && file.size > maxSizeBytes) onReject?.(file, "size");
      else if (!multiple && accepted.length >= 1) onReject?.(file, "count");
      else accepted.push(file);
    }
    if (accepted.length > 0) onFilesSelected(accepted);
  };
  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setDragging(event.type !== "dragleave");
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) receive(Array.from(event.dataTransfer.files));
  };

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined} className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span id={labelId} className="text-label text-ink">
        {label}
        {optionalLabel ? <span className="font-normal text-ink-muted"> ({optionalLabel})</span> : null}
      </span>
      <div
        role="presentation"
        data-dragging={dragging ? "" : undefined}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong bg-surface px-4 py-6 text-center transition-colors duration-state",
          "data-dragging:border-solid data-dragging:border-ink data-dragging:bg-surface-2",
          error && "border-error",
          disabled && "bg-surface-2",
        )}
      >
        <Upload aria-hidden strokeWidth={1.5} className="size-6 text-ink-muted" />
        {dropHint ? <p className="text-small text-ink-muted">{dropHint}</p> : null}
        <Button variant="secondary" disabled={disabled} aria-describedby={hintId} onClick={() => inputRef.current?.click()}>
          {labels.choose}
        </Button>
        <input
          ref={inputRef}
          type="file"
          hidden
          tabIndex={-1}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            receive(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }}
        />
      </div>
      {error && errorId ? (
        <FieldMessage id={errorId} kind="error">
          {error}
        </FieldMessage>
      ) : null}
      {hint && hintId ? (
        <FieldMessage id={hintId} kind="hint">
          {hint}
        </FieldMessage>
      ) : null}
      {items.length > 0 ? (
        <ul aria-labelledby={labelId} className="flex flex-col">
          {items.map((item) => (
            <FileDropItem key={item.id} item={item} labels={labels} onRetry={onRetry} onRemove={onRemove} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
