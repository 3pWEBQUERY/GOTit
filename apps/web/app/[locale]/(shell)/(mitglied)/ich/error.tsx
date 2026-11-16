"use client";

import { MemberOverviewError } from "@/features/member/components/member-overview-error";

export default function MemberOverviewErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <MemberOverviewError reset={reset} />;
}
