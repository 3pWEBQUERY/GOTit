"use client";

import type { Locale } from "@app/core/locale";
import { RadioGroup, Select, Switch } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyTheme } from "../../appearance/apply-theme";
import { THEMES, type Theme } from "../../appearance/theme";
import { SaveStatus } from "../components/save-status";
import { useInstantSave, usePreferenceSwitch } from "../hooks/use-instant-save";

export interface AppearanceSettingsProps {
  locale: Locale;
  /** Dieselbe Seite in jeder Sprache, mit übersetztem Pfad. */
  localeHrefs: Record<Locale, string>;
  localeNames: Record<Locale, string>;
  theme: Theme;
  reducedMotion: boolean;
  neutralTabTitle: boolean;
  /** Titel im Tab: neutral und regulär für diese Seite. */
  titles: { neutral: string; regular: string };
}

function applyMotion(reduced: boolean) {
  if (reduced) document.documentElement.setAttribute("data-motion", "reduced");
  else document.documentElement.removeAttribute("data-motion");
}

/**
 * Sprache, Farbschema, Bewegung und neutraler Seitentitel (PRD 7.5, 13).
 * Jede Wahl wirkt sofort am Dokument und wird im Konto gespeichert; die
 * Server Action setzt zusätzlich die Cookies für das erste Rendern.
 */
export function AppearanceSettings({ locale, localeHrefs, localeNames, theme: initialTheme, reducedMotion, neutralTabTitle, titles }: AppearanceSettingsProps) {
  const t = useTranslations("settings.appearance");
  const router = useRouter();
  const [language, setLanguage] = useState<Locale>(locale);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const languageSave = useInstantSave();
  const themeSave = useInstantSave();
  const motion = usePreferenceSwitch(reducedMotion, (value) => ({ reducedMotion: value }), applyMotion);
  const neutral = usePreferenceSwitch(
    neutralTabTitle,
    (value) => ({ neutralTabTitle: value }),
    (value) => {
      document.title = value ? titles.neutral : titles.regular;
    },
  );

  async function changeLanguage(next: string) {
    const target = (Object.keys(localeHrefs) as Locale[]).find((candidate) => candidate === next);
    if (!target || target === language) return;
    setLanguage(target);
    if (await languageSave.save({ locale: target })) router.replace(localeHrefs[target]);
    else setLanguage(language);
  }

  async function changeTheme(next: string) {
    const target = THEMES.find((candidate) => candidate === next);
    if (!target) return;
    const previous = theme;
    setTheme(target);
    applyTheme(target);
    if (await themeSave.save({ theme: target })) return;
    setTheme(previous);
    applyTheme(previous);
  }

  const themeLabels: Record<Theme, string> = { system: t("themeSystem"), light: t("themeLight"), dark: t("themeDark") };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Select
          id="darstellung-sprache"
          label={t("language")}
          value={language}
          onValueChange={(next) => void changeLanguage(next)}
          options={(Object.keys(localeNames) as Locale[]).map((value) => ({ value, label: localeNames[value] }))}
        />
        <SaveStatus status={languageSave.status} label={languageSave.statusLabel} />
      </div>
      <div className="flex flex-col gap-1">
        <RadioGroup label={t("theme")} value={theme} onValueChange={(next) => void changeTheme(next)} options={THEMES.map((value) => ({ value, label: themeLabels[value] }))} />
        <SaveStatus status={themeSave.status} label={themeSave.statusLabel} />
      </div>
      <div className="flex flex-col divide-y divide-border border-y border-border">
        <Switch label={t("reducedMotion")} description={t("reducedMotionHint")} {...motion} />
        <Switch label={t("neutralTitle")} description={t("neutralTitleHint")} {...neutral} />
      </div>
    </div>
  );
}
