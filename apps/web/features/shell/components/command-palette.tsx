"use client";

import { Dialog, DialogContent, cn } from "@app/ui";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export interface CommandItem {
  label: string;
  href: string;
  group: string;
}

export interface CommandPaletteProps {
  labels: { title: string; input: string; empty: string; close: string };
  items: readonly CommandItem[];
}

/** Befehlspalette: `Cmd/Ctrl + K` findet Seiten beider Bereiche (PRD 6.1, Punkt 6). */
export function CommandPalette({ labels, items }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((value) => !value);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const needle = query.trim().toLocaleLowerCase();
  const results = needle ? items.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase().includes(needle)) : items;
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setActive(0);
    }
  }

  function go(item: CommandItem | undefined) {
    if (!item) return;
    onOpenChange(false);
    router.push(item.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") setActive(Math.min(activeIndex + 1, results.length - 1));
    else if (event.key === "ArrowUp") setActive(Math.max(activeIndex - 1, 0));
    else if (event.key === "Enter") go(results[activeIndex]);
    else return;
    event.preventDefault();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={labels.title}
        closeLabel={labels.close}
        data-command-palette
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="flex min-h-11 items-center gap-2 rounded-control border border-border-strong bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
          <Search aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            role="combobox"
            aria-label={labels.input}
            aria-expanded
            aria-controls={`${id}-list`}
            aria-activedescendant={results[activeIndex] ? `${id}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            placeholder={labels.input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink-muted"
          />
        </div>
        <div id={`${id}-list`} role="listbox" aria-label={labels.title} className="mt-3 max-h-80 overflow-y-auto">
          {results.map((item, index) => (
            <div
              key={item.href}
              tabIndex={-1}
              onKeyDown={(event) => {
                if (event.key === "Enter") go(item);
              }}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onPointerMove={() => setActive(index)}
              onClick={() => go(item)}
              className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-control px-3 text-body", index === activeIndex && "bg-surface-2")}
            >
              <span>{item.label}</span>
              <span className="text-small text-ink-muted">{item.group}</span>
            </div>
          ))}
        </div>
        {results.length === 0 ? (
          <p role="status" className="px-3 py-4 text-small text-ink-muted">
            {labels.empty}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
