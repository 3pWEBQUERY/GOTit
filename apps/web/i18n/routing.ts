import { DEFAULT_LOCALE, LOCALES } from "@app/core/locale";
import { defineRouting } from "next-intl/routing";
import { communityPathnames } from "./pathnames/community";
import { infoPathnames } from "./pathnames/info";
import { marketplacePathnames } from "./pathnames/marketplace";
import { memberPathnames } from "./pathnames/member";
import { studioPathnames } from "./pathnames/studio";

/** Alle Pfade stehen hinter einem Sprachpräfix und sind pro Sprache übersetzt (PRD 7). */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  pathnames: {
    ...marketplacePathnames,
    ...communityPathnames,
    ...infoPathnames,
    ...memberPathnames,
    ...studioPathnames,
    // Admin (PRD 7.8): intern, in allen Sprachen gleich.
    "/admin": "/admin",
    "/admin/verifizierungen": "/admin/verifizierungen",
    "/admin/verifizierungen/[id]": "/admin/verifizierungen/[id]",
    "/admin/medien": "/admin/medien",
    "/admin/medien/[id]": "/admin/medien/[id]",
    "/admin/bewertungen": "/admin/bewertungen",
    "/admin/bewertungen/[id]": "/admin/bewertungen/[id]",
    "/admin/meldungen": "/admin/meldungen",
    "/admin/meldungen/[id]": "/admin/meldungen/[id]",
    "/dev/ui": "/dev/ui",
    "/dev/ui/[gruppe]": "/dev/ui/[gruppe]",
    "/dev/verifizierung/[ref]": "/dev/verifizierung/[ref]",
  },
});

export type AppPathname = keyof typeof routing.pathnames;
