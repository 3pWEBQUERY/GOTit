import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const config: NextConfig = {
  // Eigener Build-Ordner pro paralleler Arbeitskopie (zum Beispiel .next-a), damit sich Builds nicht überschreiben.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@app/ui", "@app/core", "@app/db", "@app/auth", "@app/jobs"],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "bullmq", "ioredis"],
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: false,
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
  // Alte Adressen der Meldungen (Schritt 1.8) führen dauerhaft zur Moderation (v2 7.8, Entscheid 0021).
  redirects: async () => [
    { source: "/:locale(de|fr|it|en)/admin/meldungen", destination: "/:locale/admin/moderation", permanent: true },
    { source: "/:locale(de|fr|it|en)/admin/meldungen/:id", destination: "/:locale/admin/moderation/:id", permanent: true },
    { source: "/admin/meldungen", destination: "/admin/moderation", permanent: true },
    { source: "/admin/meldungen/:id", destination: "/admin/moderation/:id", permanent: true },
    // Die Prüfung der Organisationen (Schritt 1.11) heisst wie in der PRD «Unternehmen» (v2 7.8, Entscheid 0022).
    { source: "/:locale(de|fr|it|en)/admin/organisationen", destination: "/:locale/admin/unternehmen", permanent: true },
    { source: "/:locale(de|fr|it|en)/admin/organisationen/:id", destination: "/:locale/admin/unternehmen/:id", permanent: true },
  ],
};

export default withNextIntl(config);
