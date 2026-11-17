/**
 * Anordnung der Profilansicht. `responsive` ist die echte Seite (Breakpoints
 * des Browsers); `mobile` und `desktop` erzwingen eine Anordnung für die
 * Vorschau im Studio, die in einer schmalen Spalte läuft. Die Klassen stehen
 * ausgeschrieben, damit Tailwind sie findet.
 */
export type ProfileLayout = "responsive" | "mobile" | "desktop";

interface LayoutClasses {
  root: string;
  gallery: string;
  aside: string;
  asideInner: string;
  main: string;
  /** Kontaktspalte (ContactBar `sticky-panel`); auf Mobile übernimmt die Leiste unten. */
  panel: string;
  /** «Melden» am Ende des Inhalts, nur wo die Kontaktspalte fehlt. */
  bottomReport: string;
}

export const LAYOUT: Record<ProfileLayout, LayoutClasses> = {
  responsive: {
    root: "flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-x-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]",
    gallery: "md:col-start-1 md:row-start-1",
    aside: "md:col-start-2 md:row-span-2 md:row-start-1",
    asideInner: "flex flex-col gap-6 md:sticky md:top-24",
    main: "flex min-w-0 flex-col gap-8 md:col-start-1 md:row-start-2",
    panel: "hidden md:static md:flex",
    bottomReport: "md:hidden",
  },
  mobile: {
    root: "flex flex-col gap-6",
    gallery: "",
    aside: "",
    asideInner: "flex flex-col gap-6",
    main: "flex min-w-0 flex-col gap-8",
    panel: "hidden",
    bottomReport: "",
  },
  desktop: {
    root: "grid grid-cols-[minmax(0,1fr)_minmax(0,22rem)] gap-6 gap-x-8",
    gallery: "col-start-1 row-start-1",
    aside: "col-start-2 row-span-2 row-start-1",
    asideInner: "flex flex-col gap-6",
    main: "col-start-1 row-start-2 flex min-w-0 flex-col gap-8",
    panel: "md:static",
    bottomReport: "hidden",
  },
};

/** Die mobile Kontaktleiste in der Vorschau: an ihrem Platz statt fixiert über dem Editor. */
export const PREVIEW_MOBILE_BAR = "static bottom-auto left-auto w-full max-w-none translate-x-0 md:block";
