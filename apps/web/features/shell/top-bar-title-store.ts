/** Titel der mobilen Top-Leiste. Seiten setzen ihn, die Leiste liest ihn. */
let current: string | null = null;
const listeners = new Set<() => void>();

export const topBarTitleStore = {
  set(title: string | null) {
    current = title;
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => current,
  getServer: () => null,
};
