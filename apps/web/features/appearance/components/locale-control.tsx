"use client";

import { LOCALES, type Locale } from "@app/core/locale";
import { cn } from "@app/ui";
import { useParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";

/** Wechselt die Sprache und bleibt auf derselben Seite; der Pfad wird mitübersetzt. */
export function LocaleControl({ current, label, names }: { current: Locale; label: string; names: Record<Locale, string> }) {
  const pathname = usePathname();
  const params = useParams();
  return (
    <nav aria-label={label}>
      <p className="mb-2 text-label text-ink-muted">{label}</p>
      <ul className="flex flex-wrap gap-1">
        {LOCALES.map((locale) => (
          <li key={locale}>
            <Link
              // @ts-expect-error -- pathname und params stammen von der aktuellen Route und passen zusammen
              href={{ pathname, params }}
              locale={locale}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === current ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-3 text-small font-[550] md:min-h-9",
                locale === current ? "bg-surface text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {names[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
