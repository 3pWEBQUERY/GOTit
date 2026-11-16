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
  transpilePackages: ["@app/ui", "@app/core", "@app/db", "@app/auth"],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: false,
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
};

export default withNextIntl(config);
