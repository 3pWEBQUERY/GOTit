"use client";

import { Button, useToast } from "@app/ui";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { makeCover } from "../actions/arrange";

/** Titelbild: genau eines pro Profil. Ist dieses es schon, steht das als Satz da statt eines Schalters. */
export function CoverControl({ mediaId, isCover, eligible }: { mediaId: string; isCover: boolean; eligible: boolean }) {
  const t = useTranslations("media.detail");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  if (isCover) return <p className="text-body text-ink">{t("isCover")}</p>;
  if (!eligible) return <p className="text-small text-ink-muted">{t("coverNotYet")}</p>;
  return (
    <Button
      icon={<Star aria-hidden strokeWidth={1.5} />}
      loading={pending}
      className="self-start"
      onClick={async () => {
        setPending(true);
        const result = await makeCover({ mediaId }).catch(() => ({ ok: false }));
        setPending(false);
        toast(result.ok ? { title: t("coverSaved"), tone: "success" } : { title: t("saveError"), tone: "error" });
        if (result.ok) router.refresh();
      }}
    >
      {t("makeCover")}
    </Button>
  );
}
