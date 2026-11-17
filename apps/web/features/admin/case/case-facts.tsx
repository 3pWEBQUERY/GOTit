import { pickLocalizedName, type Locale } from "@app/core/locale";
import { RateTable, UiLink } from "@app/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../shell/nav/href";
import type { ReviewCase } from "../queries/get-case";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-body break-words text-ink">{children}</dd>
    </div>
  );
}

/** Linke Spalte des Einzelfalls: die Angaben des Profils und frühere Fälle (PRD 12.4). */
export async function CaseFacts({ locale, review }: { locale: Locale; review: ReviewCase }) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: "admin.case" }), getFormatter({ locale })]);
  const profile = review.providerProfile;
  const languageNames = new Intl.DisplayNames([locale], { type: "language" });
  const href = createHref(locale);
  const earlier = profile.reviews.filter((entry) => entry.id !== review.id);
  const date = (value: Date) => format.dateTime(value, { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <section aria-labelledby="angaben" className="flex min-w-0 flex-col gap-2">
      <h2 id="angaben" className="text-h3">
        {t("facts.title")}
      </h2>
      <dl>
        <Fact label={t("facts.displayName")}>{profile.displayName}</Fact>
        <Fact label={t("facts.description")}>
          {profile.description ? <span className="whitespace-pre-line">{profile.description}</span> : <span className="text-ink-muted">{t("facts.none")}</span>}
        </Fact>
        <Fact label={t("facts.languages")}>
          {profile.languages.length > 0 ? profile.languages.map((code) => languageNames.of(code) ?? code).join(", ") : <span className="text-ink-muted">{t("facts.none")}</span>}
        </Fact>
        <Fact label={t("facts.regions")}>
          {profile.regions.length > 0 ? profile.regions.map((entry) => pickLocalizedName(entry.region, locale)).join(", ") : <span className="text-ink-muted">{t("facts.none")}</span>}
        </Fact>
      </dl>
      <RateTable
        caption={t("facts.rates")}
        columns={{ duration: t("facts.rateDuration"), price: t("facts.ratePrice"), note: t("facts.rateNote") }}
        rows={profile.rates.map((rate, index) => ({
          key: String(index),
          duration: t("facts.minutes", { count: rate.durationMinutes }),
          price: format.number(rate.priceChf, { style: "currency", currency: "CHF", maximumFractionDigits: 0 }),
          note: rate.note ?? undefined,
        }))}
        emptyText={t("facts.noRates")}
        className="pt-3"
      />
      <h3 className="pt-4 text-label text-ink-muted">{t("facts.earlier")}</h3>
      {earlier.length === 0 ? (
        <p className="text-small text-ink-muted">{t("facts.noEarlier")}</p>
      ) : (
        <ul className="flex flex-col">
          {earlier.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 border-b border-border py-2 text-small">
              <UiLink href={href({ pathname: "/admin/verifizierungen/[id]", params: { id: entry.id } })} className="font-[550] text-ink underline-offset-4 hover:underline">
                {entry.decision ? t(`decisionLabel.${entry.decision}`) : t("decisionLabel.open")}
                {entry.decidedAt ? ` · ${date(entry.decidedAt)}` : ""}
              </UiLink>
              {entry.reason ? <span className="text-ink-muted">{entry.reason}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
