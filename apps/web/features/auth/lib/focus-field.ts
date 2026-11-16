/**
 * Setzt den Fokus auf ein Feld. Trägt die ID ein Container (Auswahlgruppe),
 * geht der Fokus auf die gewählte oder erste Option darin.
 */
export function focusField(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  const target = element.matches("input, button, select, textarea")
    ? element
    : element.querySelector<HTMLElement>("[role=radio][aria-checked=true], [role=radio], input, button");
  (target ?? element).focus();
  (target ?? element).scrollIntoView({ block: "center" });
}
