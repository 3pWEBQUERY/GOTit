/** Tastaturlogik der `Combobox`: welche Option nach einer Navigationstaste markiert ist. */

interface NavigableOption {
  value: string;
  disabled?: boolean;
}

function nextEnabled(options: readonly NavigableOption[], from: number, direction: 1 | -1): number {
  for (let step = 1; step <= options.length; step += 1) {
    const index = (from + direction * step + options.length * (step + 1)) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

export interface ComboboxNavigationState {
  open: boolean;
  activeIndex: number;
  /** Aktuell gewählter Wert; beim Öffnen beginnt die Markierung dort. */
  value: string | null;
}

/**
 * Gibt den Index der Option zurück, die nach `key` markiert ist, oder `null`,
 * wenn die Taste nicht navigiert. Deaktivierte Optionen werden übersprungen;
 * am Ende der Liste geht es am Anfang weiter. `-1` heisst: keine Option.
 */
export function comboboxNavigate(key: string, options: readonly NavigableOption[], state: ComboboxNavigationState): number | null {
  if (key === "ArrowDown" || key === "ArrowUp") {
    const direction = key === "ArrowDown" ? 1 : -1;
    if (state.open && state.activeIndex >= 0) return nextEnabled(options, state.activeIndex, direction);
    const selectedIndex = state.open ? -1 : options.findIndex((option) => option.value === state.value);
    if (selectedIndex >= 0) return nextEnabled(options, selectedIndex - direction, direction);
    return nextEnabled(options, direction === 1 ? -1 : options.length, direction);
  }
  if (!state.open) return null;
  if (key === "Home") return nextEnabled(options, -1, 1);
  if (key === "End") return nextEnabled(options, options.length, -1);
  return null;
}
