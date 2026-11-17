import type { PublicOrganization } from "@app/core/organization";
import { TrustSignals, UiLink, cn } from "@app/ui";
import { ExternalLink, Flag, Mail, Phone } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { initialsOf } from "../../profile/model";
import { logoOf } from "../model";

const DATE = { day: "2-digit", month: "2-digit", year: "numeric" } as const;

/** Name, Art, Regionen und Logo (v2 9.4 mit dem Aufbau von 10). */
export function ClubHeader({
  organization,
  level = 1,
}: {
  organization: PublicOrganization;
  level?: 1 | 2;
}) {
  const t = useTranslations("clubs");
  const logo = logoOf(organization);
  const regions = [
    ...new Set(
      organization.locations.flatMap((location) =>
        location.regionName ? [location.regionName] : [],
      ),
    ),
  ];
  const Heading = `h${level}` as const;
  return (
    <header className="flex items-start gap-4">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-2">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Varianten kommen fertig aus /media; next/image würde sie ein zweites Mal kodieren
          <img
            src={logo.src}
            alt={logo.alt ?? t("header.logoAlt", { name: organization.name })}
            className="size-full object-cover"
          />
        ) : (
          <span aria-hidden className="text-h3 text-ink-muted select-none">
            {initialsOf(organization.name)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <Heading
          className={cn(level === 1 ? "text-h1" : "text-h2", "break-words")}
        >
          {organization.name}
        </Heading>
        <p className="text-body text-ink-muted">
          {[t(`kind.${organization.kind}`), regions.join(", ")]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </header>
  );
}

/**
 * Eigenes Vertrauenssignal der Organisation, getrennt von den Signalen der
 * Anbieter (v1 FR-VERIFY-004): was geprüft wurde, wann, und was es nicht aussagt.
 */
export function ClubTrust({ verifiedAt }: { verifiedAt: Date | null }) {
  const t = useTranslations("clubs.trust");
  const format = useFormatter();
  return (
    <TrustSignals
      label={t("listLabel")}
      signals={[
        {
          key: "business",
          label: t("label"),
          infoLabel: t("info"),
          explanation: {
            checked: t("checked"),
            checkedAt: verifiedAt
              ? format.dateTime(verifiedAt, DATE)
              : t("checkedAtUnknown"),
            notImplied: t("notImplied"),
          },
        },
      ]}
      explanationLabels={{
        checked: t("explanation.checked"),
        checkedAt: t("explanation.checkedAt"),
        notImplied: t("explanation.notImplied"),
      }}
      closeLabel={t("close")}
    />
  );
}

const contactLink =
  "inline-flex min-h-11 items-center gap-2 text-body text-ink underline underline-offset-4 break-all hover:text-accent";

/** Kontaktwege als Links; nur, was die Organisation öffentlich angibt. */
export function ContactLinks({
  website,
  phone,
  email,
}: {
  website: string | null;
  phone: string | null;
  email: string | null;
}) {
  const t = useTranslations("clubs.contact");
  if (!website && !phone && !email)
    return <p className="text-body text-ink-muted">{t("none")}</p>;
  return (
    <ul className="flex flex-col">
      {website ? (
        <li>
          <a
            href={website}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className={contactLink}
          >
            <ExternalLink
              aria-hidden
              strokeWidth={1.5}
              className="size-4 shrink-0"
            />
            {website.replace(/^https:\/\//, "")}
            <span className="sr-only"> {t("newWindow")}</span>
          </a>
        </li>
      ) : null}
      {phone ? (
        <li>
          <a
            href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
            className={contactLink}
          >
            <Phone aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
            {phone}
          </a>
        </li>
      ) : null}
      {email ? (
        <li>
          <a href={`mailto:${email}`} className={contactLink}>
            <Mail aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
            {email}
          </a>
        </li>
      ) : null}
    </ul>
  );
}

/** Kontakt und Melden in der Seitenspalte (v2 10, 10.1). */
export function ClubContact({
  organization,
  reportHref,
  id,
}: {
  organization: PublicOrganization;
  reportHref: string;
  id: string;
}) {
  const t = useTranslations("clubs.contact");
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
    >
      <h2 id={id} className="text-h3">
        {t("title")}
      </h2>
      <ContactLinks
        website={organization.website}
        phone={organization.phone}
        email={organization.publicEmail}
      />
      <UiLink
        href={reportHref}
        className="inline-flex min-h-11 items-center gap-2 text-small text-ink underline underline-offset-4 hover:text-accent"
      >
        <Flag aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
        {t("report")}
      </UiLink>
    </section>
  );
}

export type ClubTab = "overview" | "team";

/** Tabs der Clubseite, der aktive steht in der URL (v2 13). */
export function ClubTabs({
  current,
  links,
  providerCount,
}: {
  current: ClubTab;
  links: Record<ClubTab, string>;
  providerCount: number;
}) {
  const t = useTranslations("clubs.tabs");
  return (
    <nav
      aria-label={t("label")}
      className="sticky top-14 z-10 -mx-4 border-b border-border bg-bg px-4 md:static md:mx-0 md:px-0"
    >
      <ul className="flex gap-6 overflow-x-auto">
        {(["overview", "team"] as const).map((tab) => (
          <li key={tab}>
            <UiLink
              href={links[tab]}
              aria-current={current === tab ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center border-b-2 text-body whitespace-nowrap",
                current === tab
                  ? "border-accent font-[550] text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {t(tab)}
              {tab === "team" && providerCount > 0 ? (
                <span className="tabular ml-1 text-ink-muted">
                  {providerCount}
                </span>
              ) : null}
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
