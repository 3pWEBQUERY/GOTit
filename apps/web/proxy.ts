import { storageOrigins } from "@app/storage/origins";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { canonicalRedirectUrl } from "./features/system/canonical-host";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/** Herkunft des Echtzeit-Dienstes (`wss://…`) für `connect-src`; ohne gültige URL keine (Entscheid 0014). */
function realtimeOrigin(): string {
  try {
    const url = new URL(process.env.REALTIME_URL ?? "");
    return url.protocol === "ws:" || url.protocol === "wss:" ? ` ${url.protocol}//${url.host}` : "";
  } catch {
    return "";
  }
}

/** Strikte Content Security Policy mit Nonce pro Anfrage (PRD 16.2). */
function buildCsp(nonce: string): string {
  const development = process.env.NODE_ENV === "development";
  // Treiber s3: Uploads gehen direkt in den Bucket, geschützte Varianten leiten auf presigned URLs um (Entscheid 0011).
  const storage = storageOrigins().map((origin) => ` ${origin}`).join("");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-inline'" : ""}`,
    // Radix und Diagramme positionieren über style-Attribute; Skripte sind davon nicht betroffen.
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' blob: data:${storage}`,
    "font-src 'self'",
    `connect-src 'self'${storage}${realtimeOrigin()}${development ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export default function proxy(request: NextRequest) {
  const canonical = canonicalRedirectUrl({ host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"), pathname: request.nextUrl.pathname, search: request.nextUrl.search });
  if (canonical) return NextResponse.redirect(canonical, 308);
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
