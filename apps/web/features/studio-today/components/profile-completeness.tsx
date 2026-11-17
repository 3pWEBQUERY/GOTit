import { UiLink, buttonVariants } from "@app/ui";

const textLink =
  "inline-flex min-h-11 items-center self-start text-body text-ink underline underline-offset-4 hover:text-accent";

/** «Dein Profil» (PRD v2 11.1): wie vollständig, was zuerst fehlt und der Weg dorthin, dazu der Blick in den Marktplatz. */
export function ProfileCompletenessSection({
  heading,
  summary,
  fix,
  marketplace,
  verification,
}: {
  heading: string;
  summary: string;
  fix: { href: string; label: string } | null;
  marketplace: { href: string; label: string } | null;
  verification: { href: string; label: string };
}) {
  return (
    <section
      aria-labelledby="today-profile-heading"
      data-today-profile
      className="flex flex-col gap-3"
    >
      <h2 id="today-profile-heading" className="text-h2">
        {heading}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-body">{summary}</p>
        {fix ? (
          <UiLink
            href={fix.href}
            className={buttonVariants({ variant: "secondary" })}
          >
            {fix.label}
          </UiLink>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-6">
        {marketplace ? (
          <UiLink href={marketplace.href} className={textLink}>
            {marketplace.label}
          </UiLink>
        ) : null}
        <UiLink href={verification.href} className={textLink}>
          {verification.label}
        </UiLink>
      </div>
    </section>
  );
}
