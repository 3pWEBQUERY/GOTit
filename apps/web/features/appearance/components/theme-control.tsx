"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { cn } from "@app/ui";
import { applyTheme } from "../apply-theme";
import { THEMES, type Theme } from "../theme";

const icons = { system: Monitor, light: Sun, dark: Moon } as const;

export interface ThemeControlProps {
  initial: Theme;
  label: string;
  options: Record<Theme, string>;
}

/** Darstellung hell, dunkel oder wie das Gerät. Wirkt sofort und wird im Cookie gemerkt. */
export function ThemeControl({ initial, label, options }: ThemeControlProps) {
  const [theme, setTheme] = useState(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <fieldset>
      <legend className="mb-2 text-label text-ink-muted">{label}</legend>
      <div className="inline-flex rounded-full bg-surface p-1">
        {THEMES.map((option) => {
          const Icon = icons[option];
          return (
            <button
              key={option}
              type="button"
              aria-pressed={theme === option}
              onClick={() => choose(option)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-small font-[550] transition-colors duration-state md:min-h-9",
                theme === option ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon aria-hidden strokeWidth={1.5} className="size-4" />
              {options[option]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
