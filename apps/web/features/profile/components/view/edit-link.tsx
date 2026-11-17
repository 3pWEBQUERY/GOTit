"use client";

import { UiLink } from "@app/ui";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

/**
 * Öffnet einen Abschnitt im Seitenpanel über dem Profil (`?bearbeiten=…`),
 * ohne an den Seitenanfang zu springen. Zurück schliesst das Panel (PRD 8.2).
 */
export function EditLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const router = useRouter();
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    router.push(href, { scroll: false });
  }
  return (
    <UiLink href={href} onClick={open} className={className ?? "inline-flex min-h-11 items-center text-small text-ink underline underline-offset-4 hover:text-accent"}>
      {children}
    </UiLink>
  );
}
