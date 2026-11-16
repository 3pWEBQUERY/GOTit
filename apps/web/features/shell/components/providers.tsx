"use client";

import { LinkProvider, ToastProvider, TooltipProvider, type UiLinkProps } from "@app/ui";
import NextLink from "next/link";
import type { ReactNode } from "react";

function AppLink({ href, ...props }: UiLinkProps) {
  return <NextLink href={href} {...props} />;
}

/** Gibt dem Designsystem die Navigation der App und stellt Toasts und Tooltips bereit. */
export function Providers({ children, toastLabels }: { children: ReactNode; toastLabels: { close: string; region: string } }) {
  return (
    <LinkProvider component={AppLink}>
      <TooltipProvider>
        <ToastProvider labels={toastLabels}>{children}</ToastProvider>
      </TooltipProvider>
    </LinkProvider>
  );
}
