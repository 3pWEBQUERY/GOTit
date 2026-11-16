import type { ReactNode } from "react";

export interface AppHeaderProps {
  logo: ReactNode;
  /** Nur für Anbieter und Organisationsmitglieder. */
  modeSwitch?: ReactNode;
  /** Hauptnavigation, sichtbar ab 1024 px. */
  navigation: ReactNode;
  navigationLabel: string;
  /** Öffnet die Navigation als Seiten-Sheet zwischen 768 und 1023 px. */
  navigationTrigger: ReactNode;
  /** Suchfeld, sichtbar ab 1280 px. */
  search: ReactNode;
  /** Suche als Icon in der Aktionsgruppe unter 1280 px. */
  searchTrigger: ReactNode;
  actions: ReactNode;
}

/**
 * Kopfzeile der einen Shell: 64 px, einzeilig, deckend, ab 768 px sichtbar.
 * Sie steht über Marktplatz, Community, Mitgliederbereich und Studio und wird
 * beim Wechsel zwischen ihnen nicht neu aufgebaut (PRD 6).
 */
export function AppHeader({ logo, modeSwitch, navigation, navigationLabel, navigationTrigger, search, searchTrigger, actions }: AppHeaderProps) {
  return (
    <header data-app-header className="sticky top-0 z-40 hidden h-16 border-b border-border bg-bg md:block">
      <div className="relative mx-auto flex h-16 max-w-content items-center gap-3 px-6">
        <div className="lg:hidden">{navigationTrigger}</div>
        {logo}
        {modeSwitch}
        <nav aria-label={navigationLabel} className="hidden items-center gap-1 lg:flex">
          {navigation}
        </nav>
        <div className="ml-auto hidden w-72 xl:block">{search}</div>
        <div className="ml-auto flex items-center gap-1 xl:ml-0">
          <div className="xl:hidden">{searchTrigger}</div>
          {actions}
        </div>
      </div>
    </header>
  );
}
