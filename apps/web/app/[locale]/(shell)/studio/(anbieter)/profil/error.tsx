"use client";

import { ProfileError } from "@/features/profile/components/page/profile-error";

export default function StudioProfileErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <ProfileError reset={reset} />;
}
