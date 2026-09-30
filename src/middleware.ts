import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Hafash Middleware
 * 
 * Handles subdomain routing for photographers.
 * 
 * - ahmedwedding.hafash.pk → /studio/ahmedwedding
 * - ahmedwedding.hafash.pk/gallery/abc → /studio/ahmedwedding/gallery/abc
 */

const ROOT_DOMAIN = "hafash.pk";
const RESERVED_SUBDOMAINS = [
  "www", "api", "admin", "app", "mail", "email", "ftp", "cdn",
  "static", "assets", "images", "img", "media", "video", "videos",
  "blog", "shop", "store", "help", "support", "docs", "status",
  "login", "signup", "register", "auth", "account", "dashboard",
  "settings", "profile", "user", "users", "client", "clients",
  "gallery", "galleries", "album", "albums", "photo", "photos",
  "hafash", "hafashpk", "hafash-pk", "test", "demo", "dev",
  "staging", "prod", "production", "root", "system", "web",
];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;
  
  const subdomain = extractSubdomain(host);
  
  if (!subdomain) {
    return NextResponse.next();
  }
  
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return NextResponse.next();
  }
  
  // Skip API routes, _next, static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }
  
  // Rewrite to /studio/[subdomain]
  const url = request.nextUrl.clone();
  url.pathname = `/studio/${subdomain}${pathname}`;
  
  return NextResponse.rewrite(url);
}

function extractSubdomain(host: string): string | null {
  if (!host) return null;
  
  const cleanHost = host.split(":")[0];
  
  if (!cleanHost.endsWith(`.${ROOT_DOMAIN}`)) return null;
  
  const subdomain = cleanHost.replace(`.${ROOT_DOMAIN}`, "");
  
  if (!subdomain || subdomain === "www") return null;
  if (subdomain.includes(".")) return null;
  
  return subdomain;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};