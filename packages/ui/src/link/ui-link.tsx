"use client";

import { createContext, createElement, useContext, type ComponentPropsWithRef, type ComponentType } from "react";

export type UiLinkProps = ComponentPropsWithRef<"a"> & { href: string };

const LinkContext = createContext<ComponentType<UiLinkProps> | null>(null);

/**
 * Die App gibt hier einmal ihre Link-Komponente (next/link) herein. So bleibt
 * das Designsystem frei von Framework-Abhängigkeiten und navigiert trotzdem
 * ohne Neuladen.
 */
export function LinkProvider({ component, children }: { component: ComponentType<UiLinkProps>; children: React.ReactNode }) {
  return <LinkContext.Provider value={component}>{children}</LinkContext.Provider>;
}

export function UiLink(props: UiLinkProps) {
  const component = useContext(LinkContext);
  return createElement(component ?? "a", props);
}
