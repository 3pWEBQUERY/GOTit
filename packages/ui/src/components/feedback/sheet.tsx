"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { createContext, useContext, useRef, useState, type ComponentPropsWithRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "../../cn";
import { IconButton } from "../actions/icon-button";

export type SheetDetent = "half" | "full";

/** Ab dieser Strecke in Pixeln gilt eine Bewegung am Griff als Ziehen, nicht als Tippen. */
const DRAG_THRESHOLD = 48;

const SheetContext = createContext<(open: boolean) => void>(() => undefined);

export interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/** Mobiles Bottom-Sheet mit den Stufen halb und voll (PRD 5.5). */
export function Sheet({ open, defaultOpen = false, onOpenChange, children }: SheetProps) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);

  function setOpen(next: boolean) {
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  }

  return (
    <SheetContext.Provider value={setOpen}>
      <DialogPrimitive.Root open={open ?? innerOpen} onOpenChange={setOpen}>
        {children}
      </DialogPrimitive.Root>
    </SheetContext.Provider>
  );
}

export const SheetTrigger = DialogPrimitive.Trigger;

export const SheetClose = DialogPrimitive.Close;

export interface SheetContentProps extends Omit<ComponentPropsWithRef<typeof DialogPrimitive.Content>, "title"> {
  title: ReactNode;
  /** Versteckt den Titel visuell; vorgelesen wird er weiterhin. */
  hideTitle?: boolean;
  /** Zugänglicher Name des Schliessen-Buttons. */
  closeLabel: string;
  /** Zugänglicher Name des Griffs («Höhe umschalten»). */
  handleLabel: string;
  /** Gesteuerte Stufe. Ohne Angabe verwaltet das Sheet sie selbst. */
  detent?: SheetDetent;
  defaultDetent?: SheetDetent;
  onDetentChange?: (detent: SheetDetent) => void;
}

/**
 * Fläche des Sheets. Auf halber Höhe ist sie Glas, auf voller Höhe deckend.
 * Der Griff ist ein Button: Tippen, Enter oder Leertaste wechseln die Stufe,
 * Ziehen nach oben öffnet ganz, Ziehen nach unten verkleinert oder schliesst.
 */
export function SheetContent({
  title,
  hideTitle,
  closeLabel,
  handleLabel,
  detent,
  defaultDetent = "half",
  onDetentChange,
  className,
  style,
  children,
  ...props
}: SheetContentProps) {
  const setOpen = useContext(SheetContext);
  const [innerDetent, setInnerDetent] = useState<SheetDetent>(defaultDetent);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const drag = useRef<{ startY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const current = detent ?? innerDetent;

  function setDetent(next: SheetDetent) {
    if (detent === undefined) setInnerDetent(next);
    onDetentChange?.(next);
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { startY: event.clientY, moved: false };
    if ("setPointerCapture" in event.currentTarget) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const distance = event.clientY - drag.current.startY;
    if (Math.abs(distance) > 4) drag.current.moved = true;
    if (drag.current.moved) setDragOffset(Math.max(0, distance));
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    drag.current = null;
    setDragOffset(null);
    if (!state?.moved) return;
    // Nach dem Ziehen löst der Browser noch einen Klick aus; der soll die Stufe nicht erneut wechseln.
    suppressClick.current = true;
    const distance = event.clientY - state.startY;
    if (distance <= -DRAG_THRESHOLD) setDetent("full");
    else if (distance >= DRAG_THRESHOLD) {
      if (current === "full") setDetent("half");
      else setOpen(false);
    }
  }

  function onPointerCancel() {
    drag.current = null;
    setDragOffset(null);
  }

  function onHandleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setDetent(current === "half" ? "full" : "half");
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 animate-fade-in transition-colors duration-layer", current === "full" ? "bg-ink/40" : "bg-ink/20")} />
      <DialogPrimitive.Content
        data-detent={current}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex animate-sheet-in flex-col rounded-t-sheet pb-[env(safe-area-inset-bottom)] text-ink",
          current === "full" ? "h-[calc(100dvh-1.5rem)] border border-border bg-surface shadow-floating" : "glass h-[50dvh]",
          dragOffset === null ? "transition-[height,transform] duration-layer" : "transition-none",
          className,
        )}
        style={dragOffset === null ? style : { ...style, transform: `translateY(${dragOffset}px)` }}
        {...(props["aria-describedby"] ? {} : { "aria-describedby": undefined })}
        {...props}
      >
        <button
          type="button"
          aria-label={handleLabel}
          aria-expanded={current === "full"}
          className="flex min-h-11 w-full shrink-0 cursor-grab touch-none items-center justify-center rounded-t-sheet active:cursor-grabbing"
          onClick={onHandleClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <span aria-hidden className="h-1 w-12 rounded-full bg-border-strong" />
        </button>
        <div className="flex shrink-0 items-start justify-between gap-4 pr-2 pb-2 pl-4">
          <DialogPrimitive.Title className={cn("min-w-0 py-2 text-h3", hideTitle && "sr-only")}>{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <IconButton label={closeLabel} icon={<X strokeWidth={1.5} />} className="ml-auto" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
