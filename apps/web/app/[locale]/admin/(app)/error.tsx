"use client";

import { AdminError } from "@/features/admin/components/admin-error";

export default function AdminErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <AdminError reset={reset} />;
}
