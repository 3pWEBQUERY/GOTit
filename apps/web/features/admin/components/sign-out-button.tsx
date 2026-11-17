"use client";

import { Button } from "@app/ui";
import { LogOut } from "lucide-react";
import { useState } from "react";

/** Meldet ab und führt zum Marktplatz. */
export function SignOutButton({ label, redirectTo }: { label: string; redirectTo: string }) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    } finally {
      window.location.assign(redirectTo);
    }
  }

  return (
    <Button variant="quiet" loading={pending} icon={<LogOut aria-hidden strokeWidth={1.5} />} onClick={() => void signOut()}>
      {label}
    </Button>
  );
}
