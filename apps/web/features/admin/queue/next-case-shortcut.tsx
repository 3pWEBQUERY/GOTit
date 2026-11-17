"use client";

import { Button, UiLink } from "@app/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.getAttribute("role") === "combobox";
}

/**
 * «Nächster Fall» (PRD 12.4): Taste N öffnet den ältesten offenen Fall. Der
 * Hinweis steht sichtbar daneben; der Link tut dasselbe mit Maus oder Tab.
 */
export function NextCaseShortcut({ href, label, hint }: { href: string; label: string; hint: { before: string; key: string; after: string } }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "n" || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (isTyping(event.target)) return;
      event.preventDefault();
      router.push(href);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [href, router]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button asChild variant="primary">
        <UiLink href={href} aria-keyshortcuts="n">
          {label}
        </UiLink>
      </Button>
      <p className="text-small text-ink-muted">
        {hint.before}
        <kbd className="mx-1 rounded-chip border border-border-strong bg-surface px-2 py-1 font-sans text-small text-ink">{hint.key}</kbd>
        {hint.after}
      </p>
    </div>
  );
}
