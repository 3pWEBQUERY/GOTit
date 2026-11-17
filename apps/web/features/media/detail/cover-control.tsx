"use client";

import { Button, useToast } from "@app/ui";
import { BadgeCheck, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { makeCover, makeLogo } from "../actions/arrange";
import { PROFILE_SCOPE, scopeInput, type MediaScope } from "../library/types";

/**
 * Titelbild: genau eines pro Profil. Ist dieses es schon, steht das als Satz
 * da statt eines Schalters. Mit `kind="logo"` dasselbe für das Logo einer
 * Organisation (Entscheid 0018).
 */
export function CoverControl({
  mediaId,
  isCover,
  eligible,
  scope = PROFILE_SCOPE,
  kind = "cover",
}: {
  mediaId: string;
  isCover: boolean;
  eligible: boolean;
  scope?: MediaScope;
  kind?: "cover" | "logo";
}) {
  const t = useTranslations("media.detail");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const logo = kind === "logo";
  if (isCover) return <p className="text-body text-ink">{t(logo ? "isLogo" : "isCover")}</p>;
  if (!eligible) return <p className="text-small text-ink-muted">{t("coverNotYet")}</p>;
  return (
    <Button
      icon={logo ? <BadgeCheck aria-hidden strokeWidth={1.5} /> : <Star aria-hidden strokeWidth={1.5} />}
      loading={pending}
      className="self-start"
      onClick={async () => {
        setPending(true);
        const result = await (logo ? makeLogo : makeCover)({ mediaId, ...scopeInput(scope) }).catch(() => ({ ok: false }));
        setPending(false);
        toast(result.ok ? { title: t(logo ? "logoSaved" : "coverSaved"), tone: "success" } : { title: t("saveError"), tone: "error" });
        if (result.ok) router.refresh();
      }}
    >
      {t(logo ? "makeLogo" : "makeCover")}
    </Button>
  );
}
