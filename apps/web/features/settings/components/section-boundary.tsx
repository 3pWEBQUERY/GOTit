"use client";

import { Button, ErrorState } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Component, type ReactNode } from "react";

interface BoundaryProps {
  children: ReactNode;
  fallback: (reset: () => void) => ReactNode;
}

class Boundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) return this.props.fallback(() => this.setState({ failed: false }));
    return this.props.children;
  }
}

/** Fehlerzustand einer einzelnen Liste: Der Rest der Seite bleibt bedienbar (PRD 13). */
export function SectionBoundary({ children }: { children: ReactNode }) {
  const t = useTranslations("settings.state");
  const router = useRouter();
  return (
    <Boundary
      fallback={(reset) => (
        <ErrorState
          title={t("errorTitle")}
          description={t("errorDescription")}
          action={
            <Button
              onClick={() => {
                reset();
                router.refresh();
              }}
            >
              {t("reload")}
            </Button>
          }
        />
      )}
    >
      {children}
    </Boundary>
  );
}
