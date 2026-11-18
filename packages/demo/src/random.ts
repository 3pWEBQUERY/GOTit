/**
 * Deterministischer Zufall für die Demo-Daten: Derselbe Schlüssel ergibt bei
 * jedem Lauf dieselben Zahlen, damit ein zweiter Lauf dieselben Bilder,
 * Zeiten und Zahlen schreibt.
 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface Random {
  /** Zahl in [0, 1). */
  next(): number;
  /** Ganze Zahl in [min, max]. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

export function createRandom(seed: string): Random {
  let state = hashString(seed) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new Error("Leere Auswahl.");
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
  };
}
