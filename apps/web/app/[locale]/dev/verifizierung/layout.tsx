import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isTestProviderEnabled } from "@/features/verification/test-provider";

/** Test-Dienstleister der Identitätsprüfung. Nie in der Produktion (Entscheid 0009). */
export default function DevVerificationLayout({ children }: { children: ReactNode }) {
  if (!isTestProviderEnabled()) notFound();
  return (
    <div className="mx-auto max-w-reading px-4 py-8 md:px-6">
      <main id="inhalt">{children}</main>
    </div>
  );
}
