import { priceOf, type FormValues } from "./editor-values";
import type { ContactState, ProfileViewModel } from "./model";

export interface DraftContext {
  regionLinks: Record<string, { name: string; href: string }>;
  categories: readonly { id: string; name: string }[];
  /** Jetzt als ISO-Text, für das Änderungsdatum neuer Preise. */
  now: string;
}

function contactOf(base: ContactState, form: FormValues): ContactState {
  if (base.kind === "paused" || base.kind === "restricted") return base;
  const { allowMessages, allowBookingRequests } = form.contact;
  if (!allowMessages && !allowBookingRequests) return { kind: "none" };
  return { kind: "open", messages: allowMessages, bookingRequests: allowBookingRequests };
}

/**
 * Die Vorschau im Studio: das Profil im Online-Stand, überlagert mit den Werten
 * der Formulare, auch den noch ungespeicherten (PRD v2 11.2). Unvollständige
 * Preiszeilen erscheinen erst, wenn sie gültig sind.
 */
export function applyDraft(base: ProfileViewModel, form: FormValues, context: DraftContext): ProfileViewModel {
  const categoryNames = new Map(context.categories.map((category) => [category.id, category.name]));
  const rates = form.rates.rates
    .filter((row) => !row.hidden && Number.isFinite(priceOf(row.price)) && priceOf(row.price) > 0)
    .map((row, index) => ({ key: `r${index}`, durationMinutes: row.durationMinutes, priceChf: priceOf(row.price), note: row.note.trim() || null }));
  return {
    ...base,
    displayName: form.basics.displayName.trim() || base.displayName,
    shortDescription: form.basics.shortDescription.trim() || null,
    languages: form.basics.languages,
    description: form.description.description.trim() || null,
    services: form.offer.categoryIds.flatMap((id) => {
      const name = categoryNames.get(id);
      return name ? [{ key: id, name }] : [];
    }),
    rates,
    ratesUpdatedAt: rates.length > 0 ? (base.ratesUpdatedAt ?? context.now) : null,
    locationLabel: form.visibility.locationLabel.trim() || null,
    regions: form.regions.regionIds.flatMap((id) => {
      const link = context.regionLinks[id];
      return link ? [{ id, ...link }] : [];
    }),
    contact: contactOf(base.contact, form),
  };
}
