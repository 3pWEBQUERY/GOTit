import { InlineAlert, UiLink, buttonVariants } from "@app/ui";
import { useTranslations } from "next-intl";

/** Sichtbarkeit «nur Mitglieder» (PRD v1 FR-PROFILE-004): Besucher sehen den Namen und den Weg zur Anmeldung, sonst nichts. */
export function MembersOnly({ displayName, signInHref, registerHref }: { displayName: string; signInHref: string; registerHref: string }) {
  const t = useTranslations("profile.membersOnly");
  return (
    <div className="flex max-w-prose flex-col gap-6">
      <h1 className="text-h1 break-words">{displayName}</h1>
      <InlineAlert
        title={t("title")}
        action={
          <>
            <UiLink href={signInHref} className={buttonVariants({ variant: "primary" })}>
              {t("signIn")}
            </UiLink>
            <UiLink href={registerHref} className={buttonVariants({ variant: "secondary" })}>
              {t("register")}
            </UiLink>
          </>
        }
      >
        {t("description")}
      </InlineAlert>
    </div>
  );
}
