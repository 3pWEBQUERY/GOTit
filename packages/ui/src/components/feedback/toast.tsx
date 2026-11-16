"use client";

import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { IconButton } from "../actions/icon-button";
import { ToneIcon } from "./tone-icon";

export type ToastTone = "neutral" | "success" | "error";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Eine Aktion, in der Regel «Rückgängig». Der Toast schliesst danach. */
  action?: { label: string; onAction: () => void };
  /** Anzeigedauer in Millisekunden. Standard: 8000 mit Aktion, sonst 5000. */
  durationMs?: number;
}

export interface ToastApi {
  /** Zeigt einen Toast und gibt seine Kennung zurück. */
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

interface ToastEntry extends ToastOptions {
  id: string;
}

export interface ToastProviderProps {
  labels: {
    /** Zugänglicher Name des Schliessen-Buttons. */
    close: string;
    /** Name des Bereichs für Screenreader; `{hotkey}` wird durch die Taste F8 ersetzt. */
    region?: string;
  };
  children: ReactNode;
  /** Lage des Bereichs, zum Beispiel ein Abstand über der mobilen Tab-Leiste. */
  viewportClassName?: string;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Dauer nach PRD 13: «Rückgängig» bleibt 8 Sekunden erreichbar. */
export const TOAST_DURATION_MS = 5000;
export const TOAST_DURATION_WITH_ACTION_MS = 8000;

/**
 * Einmal um die App legen. Toasts melden Erfolg und bieten «Rückgängig»;
 * Probleme stehen am Ort ihres Entstehens (`InlineAlert`), nicht im Toast.
 */
export function ToastProvider({ labels, children, viewportClassName }: ToastProviderProps) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    counter.current += 1;
    const id = `toast-${counter.current}`;
    setEntries((current) => [...current, { ...options, id }]);
    return id;
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider label={labels.region} swipeDirection="right">
        {children}
        {entries.map((entry) => (
          <ToastItem key={entry.id} entry={entry} closeLabel={labels.close} onClose={dismiss} />
        ))}
        <ToastPrimitive.Viewport
          label={labels.region}
          className={cn(
            "fixed inset-x-0 bottom-0 z-60 flex flex-col gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:left-auto md:w-full md:max-w-panel",
            viewportClassName,
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

function ToastItem({ entry, closeLabel, onClose }: { entry: ToastEntry; closeLabel: string; onClose: (id: string) => void }) {
  const { id, title, description, tone = "neutral", action, durationMs } = entry;
  return (
    <ToastPrimitive.Root
      type={tone === "error" ? "foreground" : "background"}
      duration={durationMs ?? (action ? TOAST_DURATION_WITH_ACTION_MS : TOAST_DURATION_MS)}
      onOpenChange={(open) => {
        if (!open) onClose(id);
      }}
      className="flex animate-layer-in items-start gap-3 rounded-control border border-border bg-surface py-1 pr-1 pl-4 text-ink shadow-floating"
    >
      <ToneIcon tone={tone} className="mt-3" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-3">
        <ToastPrimitive.Title className="text-small font-[550]">{title}</ToastPrimitive.Title>
        {description ? <ToastPrimitive.Description className="text-small text-ink-muted">{description}</ToastPrimitive.Description> : null}
        {action ? (
          <ToastPrimitive.Action asChild altText={action.label}>
            <Button variant="secondary" className="mt-2 self-start" onClick={action.onAction}>
              {action.label}
            </Button>
          </ToastPrimitive.Action>
        ) : null}
      </div>
      <ToastPrimitive.Close asChild>
        <IconButton label={closeLabel} icon={<X strokeWidth={1.5} />} />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

/** Zugriff auf `toast()` und `dismiss()`. Braucht einen `ToastProvider` weiter oben. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast braucht einen ToastProvider.");
  return api;
}
