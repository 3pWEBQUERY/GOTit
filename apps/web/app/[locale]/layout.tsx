import { isLocale } from "@app/core/locale";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MOTION_COOKIE, NEUTRAL_TITLE_COOKIE } from "@/features/appearance/preference-cookies";
import { NeutralTitle } from "@/features/appearance/components/neutral-title";
import { THEME_COOKIE, parseTheme } from "@/features/appearance/theme";
import { Providers } from "@/features/shell/components/providers";
import "../globals.css";

// Inter Variable mit optischer Grösse; next/font hostet die Dateien beim Build selbst (PRD 5.2).
const inter = Inter({ subsets: ["latin", "latin-ext"], axes: ["opsz"], display: "swap", variable: "--font-inter" });

const APP_NAME = process.env.APP_NAME ?? "GOTit";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/** Root-Layout: Schrift, Tokens, Provider. Gilt für Shell, Anmeldung und Admin. */
export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);
  const reducedMotion = cookieStore.get(MOTION_COOKIE)?.value === "reduced";
  const neutralTitle = cookieStore.get(NEUTRAL_TITLE_COOKIE)?.value === "1";
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} data-theme={theme === "system" ? undefined : theme} data-motion={reducedMotion ? "reduced" : undefined} className={inter.variable}>
      <body>
        {neutralTitle ? <NeutralTitle title={t("neutralTitle")} /> : null}
        <NextIntlClientProvider>
          <Providers toastLabels={{ close: t("closeNotification"), region: t("notificationsRegion") }}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
