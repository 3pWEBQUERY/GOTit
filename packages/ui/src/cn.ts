import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body", "small", "label"] }],
      rounded: [{ rounded: ["chip", "control", "card", "sheet", "full", "none"] }],
      shadow: [{ shadow: ["raised", "floating", "none"] }],
    },
  },
});

/** Fügt Klassen zusammen; spätere Tailwind-Klassen überschreiben frühere. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
