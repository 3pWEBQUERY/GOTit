"use client";

import { OrganizationError } from "@/features/organization/components/states";

export default function OrganizationErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <OrganizationError reset={reset} />;
}
