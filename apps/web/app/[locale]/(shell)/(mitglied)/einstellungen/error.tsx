"use client";

import { SettingsError } from "@/features/settings/components/settings-error";

export default function SettingsErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <SettingsError reset={reset} />;
}
