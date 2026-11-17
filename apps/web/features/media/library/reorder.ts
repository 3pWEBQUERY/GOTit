/** Verschiebt `id` an die Stelle von `targetId`; die übrigen rücken nach. */
export function moveTo(order: readonly string[], id: string, targetId: string): string[] {
  const from = order.indexOf(id);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return [...order];
  const next = order.filter((entry) => entry !== id);
  next.splice(to, 0, id);
  return next;
}

/** Tauscht mit dem Nachbarn: `forward` nach vorne (kleinere Position), `backward` nach hinten. */
export function moveStep(order: readonly string[], id: string, direction: "forward" | "backward"): string[] {
  const index = order.indexOf(id);
  const target = direction === "forward" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= order.length) return [...order];
  const next = [...order];
  [next[index], next[target]] = [next[target] as string, next[index] as string];
  return next;
}
