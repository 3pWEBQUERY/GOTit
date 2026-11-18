"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";

export interface MegaMenuLink {
  label: string;
  href: string;
}

export interface MegaMenuColumn {
  heading: string;
  links: readonly MegaMenuLink[];
  /** Weiterführender Link am Ende der Spalte («Alle Kantone»). */
  more?: MegaMenuLink;
  /** Hinweis statt Links, zum Beispiel für Besucher ohne Konto. */
  note?: string;
}

export interface MegaMenuProps {
  label: string;
  columns: readonly MegaMenuColumn[];
  current?: boolean;
}

const MAX_COLUMNS = 4;
const MAX_LINKS = 7;
const GRID = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" } as const;

/**
 * Mega-Menü als Disclosure-Navigation (PRD 6.3): ein Button mit `aria-expanded`
 * und Listen von Links, kein `role="menu"`. Öffnet auf Klick oder Enter, nie
 * allein auf Hover. Schliesst mit Escape (Fokus zurück zum Auslöser), Klick
 * ausserhalb und beim Verlassen per Tab. Höchstens 4 Spalten mit je 7 Links.
 */
export function MegaMenu({ label, columns, current }: MegaMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const visibleColumns = columns.slice(0, MAX_COLUMNS);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    // Verlässt der Fokus das Menü per Tab, schliesst es.
    function onFocusIn(event: FocusEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  return (
    <div ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative inline-flex min-h-10 items-center gap-1 rounded-control px-3 text-small font-[550] transition-colors duration-state",
          current
            ? "text-ink after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-ink"
            : open
              ? "text-ink"
              : "text-ink-muted hover:text-ink",
        )}
      >
        {label}
        <ChevronDown aria-hidden strokeWidth={1.5} className={cn("size-4 transition-transform duration-state", open && "rotate-180")} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="glass-light absolute inset-x-0 top-full z-40 animate-layer-in rounded-b-card border border-t-0 border-border shadow-raised"
      >
        <div className={cn("grid gap-8 px-6 py-8", GRID[visibleColumns.length as keyof typeof GRID] ?? GRID[4])}>
          {visibleColumns.map((column, index) => (
            <MegaMenuColumnList key={column.heading} column={column} headingId={`${panelId}-${index}`} onNavigate={() => setOpen(false)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MegaMenuColumnList({ column, headingId, onNavigate }: { column: MegaMenuColumn; headingId: string; onNavigate: () => void }) {
  const linkClass = "inline-flex min-h-9 items-center rounded-chip text-body text-ink hover:text-accent";
  return (
    <div>
      <p id={headingId} className="mb-2 text-label text-ink-muted">
        {column.heading}
      </p>
      {column.note ? <p className="text-small text-ink-muted">{column.note}</p> : null}
      <ul aria-labelledby={headingId}>
        {column.links.slice(0, MAX_LINKS).map((link) => (
          <li key={link.href}>
            <UiLink href={link.href} onClick={onNavigate} className={linkClass}>
              {link.label}
            </UiLink>
          </li>
        ))}
        {column.more ? (
          <li>
            <UiLink href={column.more.href} onClick={onNavigate} className={cn(linkClass, "gap-1 text-small font-[550]")}>
              {column.more.label}
              <ChevronRight aria-hidden strokeWidth={1.5} className="size-4" />
            </UiLink>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
