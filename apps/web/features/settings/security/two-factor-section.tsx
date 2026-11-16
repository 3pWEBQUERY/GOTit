"use client";

import { useToast } from "@app/ui";
import { CircleCheck, CircleDashed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { TwoFactorDisable } from "./two-factor-disable";
import { TwoFactorSetup } from "./two-factor-setup";

/** Stand des zweiten Faktors als Icon und Wort, darunter Einrichten oder Abschalten. */
export function TwoFactorSection({ enabled }: { enabled: boolean }) {
  const t = useTranslations("settings.security.twoFactor");
  const router = useRouter();
  const { toast } = useToast();
  const Icon = enabled ? CircleCheck : CircleDashed;

  function changed(title: string) {
    toast({ title, tone: "success" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p data-two-factor={enabled ? "on" : "off"} className="flex items-center gap-2 text-body">
        <Icon aria-hidden strokeWidth={1.5} className={enabled ? "size-5 text-success" : "size-5 text-ink-muted"} />
        {enabled ? t("enabled") : t("disabled")}
      </p>
      {enabled ? <TwoFactorDisable onDisabled={() => changed(t("disabledToast"))} /> : <TwoFactorSetup onFinished={() => changed(t("enabledToast"))} />}
    </div>
  );
}
