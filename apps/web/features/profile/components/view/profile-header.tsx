import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { languageName } from "../../../onboarding/format";
import type { ProfileViewModel } from "../../model";
import { EditLink } from "./edit-link";
import { Heading, type HeadingLevel } from "./heading";

/** Wer ist das, wo und in welcher Sprache (PRD v2 10): H1 Name, Region, Sprachen, Kurzbeschreibung. */
export function ProfileHeader({ model, level, editHref }: { model: ProfileViewModel; level: HeadingLevel; editHref?: string }) {
  const t = useTranslations("profile.header");
  const locale = useLocale();
  const languages = new Intl.ListFormat(locale, { type: "conjunction" }).format(model.languages.map((code) => languageName(locale, code)));
  const where = [model.regions.map((region) => region.name).join(", "), model.locationLabel].filter(Boolean).join(" · ");

  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading level={level} className={level === 1 ? "text-h1 break-words" : "text-h2 break-words"}>
          {model.displayName}
        </Heading>
        {editHref ? (
          <EditLink href={editHref}>{t("edit")}</EditLink>
        ) : null}
      </div>
      <p className="flex items-start gap-1 text-body text-ink-muted">
        <MapPin aria-hidden strokeWidth={1.5} className="mt-1 size-4 shrink-0" />
        <span className="min-w-0">
          {where || t("noRegion")}
          {languages ? ` · ${t("speaks", { languages })}` : null}
        </span>
      </p>
      {model.shortDescription ? <p className="max-w-prose text-body text-ink">{model.shortDescription}</p> : null}
    </header>
  );
}
