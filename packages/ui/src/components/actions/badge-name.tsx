/**
 * Zugänglicher Name eines Icon-Buttons aus sichtbarem Inhalt: der Name als
 * unsichtbarer Text, die Zahl sichtbar. So enthält der Name, was zu sehen ist
 * (WCAG 2.5.3), statt dass ein `aria-label` die Zahl überdeckt.
 */
export function BadgeName({ label, badge }: { label: string; badge?: number | undefined }) {
  return (
    <>
      <span className="sr-only">{label}</span>
      {badge ? (
        <span className="tabular absolute top-1 right-1 min-w-4 rounded-full bg-ink px-1 text-center text-[0.8125rem]/4 font-[550] text-bg">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </>
  );
}
