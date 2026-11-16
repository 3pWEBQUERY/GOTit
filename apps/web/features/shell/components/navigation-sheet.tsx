"use client";

import { IconButton, Sheet, SheetContent, SheetTrigger, SidePanel, SidePanelContent, SidePanelTrigger, UiLink, type MegaMenuColumn, type MegaMenuLink } from "@app/ui";
import { Menu as MenuIcon } from "lucide-react";
import { useId, useState, type MouseEvent } from "react";

export interface NavigationSheetProps {
  /** Unter 768 px ein Sheet von unten, darüber ein Seiten-Sheet (PRD 6.3, 6.5). */
  variant: "sheet" | "panel";
  labels: { open: string; title: string; close: string; handle: string };
  primaryLinks: readonly MegaMenuLink[];
  sections: readonly MegaMenuColumn[];
}

/** Entdecken-Sheet: dieselben Ziele wie die Mega-Menüs, für Breiten unter 1024 px. */
export function NavigationSheet({ variant, labels, primaryLinks, sections }: NavigationSheetProps) {
  const [open, setOpen] = useState(false);
  const trigger = <IconButton label={labels.open} icon={<MenuIcon strokeWidth={1.5} />} data-navigation-trigger={variant} />;
  const content = <NavigationTargets primaryLinks={primaryLinks} sections={sections} onNavigate={() => setOpen(false)} />;

  if (variant === "panel") {
    return (
      <SidePanel open={open} onOpenChange={setOpen}>
        <SidePanelTrigger asChild>{trigger}</SidePanelTrigger>
        <SidePanelContent title={labels.title} closeLabel={labels.close}>
          {content}
        </SidePanelContent>
      </SidePanel>
    );
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent title={labels.title} closeLabel={labels.close} handleLabel={labels.handle} defaultDetent="full">
        {content}
      </SheetContent>
    </Sheet>
  );
}

const linkClass = "flex min-h-11 items-center rounded-control px-2 text-body text-ink hover:bg-surface-2";

function NavigationTargets({
  primaryLinks,
  sections,
  onNavigate,
}: Pick<NavigationSheetProps, "primaryLinks" | "sections"> & { onNavigate: () => void }) {
  const id = useId();
  // Ein Tipp auf irgendeinen Link schliesst das Sheet; die Navigation selbst übernimmt der Link.
  function onClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a")) onNavigate();
  }
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- delegiert nur das Schliessen; bedient werden die Links darin
    <nav aria-label={id} aria-labelledby={`${id}-main`} onClick={onClick} className="flex flex-col gap-6 pb-6">
      <ul id={`${id}-main`}>
        {primaryLinks.map((link) => (
          <li key={link.href}>
            <UiLink href={link.href} className={`${linkClass} font-[550]`}>
              {link.label}
            </UiLink>
          </li>
        ))}
      </ul>
      {sections.map((section, index) => (
        <div key={section.heading}>
          <p id={`${id}-${index}`} className="mb-1 px-2 text-label text-ink-muted">
            {section.heading}
          </p>
          {section.note ? <p className="px-2 text-small text-ink-muted">{section.note}</p> : null}
          <ul aria-labelledby={`${id}-${index}`}>
            {[...section.links, ...(section.more ? [section.more] : [])].map((link) => (
              <li key={link.href}>
                <UiLink href={link.href} className={linkClass}>
                  {link.label}
                </UiLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
