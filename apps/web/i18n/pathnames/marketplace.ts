/** Übersetzte Pfade des Marktplatzes (PRD 7.1). Schlüssel sind die deutschen Pfade der PRD. */
export const marketplacePathnames = {
  "/": "/",
  "/suche": { de: "/suche", fr: "/recherche", it: "/ricerca", en: "/search" },
  "/profile": { de: "/profile", fr: "/profils", it: "/profili", en: "/profiles" },
  "/clubs": "/clubs",
  "/ch": "/ch",
  "/ch/[kanton]": "/ch/[kanton]",
  "/ch/[kanton]/[stadt]": "/ch/[kanton]/[stadt]",
  "/kategorie/[slug]": { de: "/kategorie/[slug]", fr: "/categorie/[slug]", it: "/categoria/[slug]", en: "/category/[slug]" },
  "/p/[name]": "/p/[name]",
  "/p/[name]/anfrage": { de: "/p/[name]/anfrage", fr: "/p/[name]/demande", it: "/p/[name]/richiesta", en: "/p/[name]/request" },
  "/p/[name]/bewertungen": { de: "/p/[name]/bewertungen", fr: "/p/[name]/avis", it: "/p/[name]/recensioni", en: "/p/[name]/reviews" },
  "/p/[name]/medien": { de: "/p/[name]/medien", fr: "/p/[name]/medias", it: "/p/[name]/media", en: "/p/[name]/media" },
  "/c/[slug]": "/c/[slug]",
  "/touren": { de: "/touren", fr: "/tournees", it: "/tour", en: "/tours" },
  "/alterspruefung": { de: "/alterspruefung", fr: "/verification-age", it: "/verifica-eta", en: "/age-check" },
} as const;
