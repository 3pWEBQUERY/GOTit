"use client";

import { Button } from "@app/ui";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Lädt die Seite neu, ohne den Zustand der Shell zu verlieren. */
export function RefreshButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" loading={pending} onClick={() => startTransition(() => router.refresh())} className="self-start">
      {label}
    </Button>
  );
}
