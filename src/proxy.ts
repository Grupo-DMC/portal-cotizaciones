import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (antes "middleware"). Hace dos cosas:
 *  1. Genera un nonce y aplica la Content-Security-Policy.
 *  2. Redirección optimista: sin cookie de sesión → /login.
 *     La verificación REAL de la firma, la expiración y el permiso ocurre en la
 *     capa de acceso a datos (src/server/auth/dal.ts), nunca solo aquí.
 */
const COOKIE = "dmc_session";
const PUBLICAS = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'" + (dev ? " ws: wss:" : ""),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const { pathname } = request.nextUrl;
  const tieneCookie = request.cookies.has(COOKIE);

  if (!tieneCookie && !PUBLICAS.has(pathname)) {
    // Las rutas API responden 401 en lugar de redirigir.
    if (pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { "content-type": "application/json", "Content-Security-Policy": csp },
      });
    }
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + request.nextUrl.search);
    const res = NextResponse.redirect(url);
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|img/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
