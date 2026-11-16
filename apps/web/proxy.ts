import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/** Strikte Content Security Policy mit Nonce pro Anfrage (PRD 16.2). */
function buildCsp(nonce: string): string {
  const development = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-inline'" : ""}`,
    // Radix und Diagramme positionieren über style-Attribute; Skripte sind davon nicht betroffen.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${development ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);
  // Layouts kennen ihren Pfad nicht; sie brauchen ihn für `?weiter=` (PRD 8.2).
  request.headers.set("x-return-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const response = handleI18nRouting(request);
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!api|media|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
