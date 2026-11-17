"use client";

import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  UiLink,
  useToast,
} from "@app/ui";
import { ChevronDown, LocateFixed, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  nearMeAction,
  setRegionAction,
  type SetRegionResult,
} from "../actions/set-region";

export interface RegionMenuProps {
  current: string | null;
  regions: readonly { slug: string; name: string }[];
  allRegionsHref: string;
}

/**
 * «Region ändern» (PRD v2 9.1): hervorgehobene Regionen, «In meiner Nähe» und
 * «Alle Regionen». Der Standort wird nur nach diesem ausdrücklichen Tippen abgefragt.
 */
export function RegionMenu({
  current,
  regions,
  allRegionsHref,
}: RegionMenuProps) {
  const t = useTranslations("discover.region");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const apply = (run: () => Promise<SetRegionResult>) =>
    startTransition(async () => {
      const result = await run();
      if (result.ok) {
        toast({
          title: t("changed", { region: result.name }),
          tone: "success",
        });
        router.refresh();
      } else
        toast({
          title: t(result.reason === "none" ? "nearMeNone" : "unknown"),
          tone: "error",
        });
    });

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast({ title: t("nearMeUnavailable"), tone: "error" });
      return;
    }
    toast({ title: t("nearMeLocating"), tone: "neutral" });
    navigator.geolocation.getCurrentPosition(
      (position) =>
        apply(() =>
          nearMeAction(
            position.coords.latitude,
            position.coords.longitude,
            locale,
          ),
        ),
      (error) =>
        toast({
          title: t(
            error.code === error.PERMISSION_DENIED
              ? "nearMeDenied"
              : "nearMeUnavailable",
          ),
          tone: "error",
        }),
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: 15_000,
      },
    );
  };

  return (
    <Menu>
      <MenuTrigger asChild>
        <Button
          loading={pending}
          icon={<MapPin aria-hidden strokeWidth={1.5} />}
        >
          <span className="inline-flex items-center gap-2">
            {t("change")}
            <ChevronDown
              aria-hidden
              strokeWidth={1.5}
              className="size-5 text-ink-muted"
            />
          </span>
        </Button>
      </MenuTrigger>
      <MenuContent align="end">
        {regions.map((region) => (
          <MenuItem
            key={region.slug}
            aria-current={region.slug === current ? "true" : undefined}
            onSelect={() => apply(() => setRegionAction(region.slug, locale))}
          >
            {region.name}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem
          icon={<LocateFixed aria-hidden strokeWidth={1.5} />}
          onSelect={locate}
        >
          {t("nearMe")}
        </MenuItem>
        <MenuItem asChild>
          <UiLink href={allRegionsHref}>{t("all")}</UiLink>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
