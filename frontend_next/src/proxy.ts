import { NextRequest, NextResponse } from "next/server";

// These paths are accessible without auth
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-magic-link",
  "/careers",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public assets, API routes handled by the backend, and _next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api") ||
    pathname === "/health"
  ) {
    return NextResponse.next();
  }

  // Allow all public paths (including sub-paths like /careers/[id]/apply)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for the httpOnly refresh cookie. Its mere presence means the user
  // has an active session (AuthContext will re-hydrate the access token via /auth/refresh).
  const refreshCookie =
    req.cookies.get("ims_refresh") ?? req.cookies.get("refresh_token");

  if (!refreshCookie) {
    const loginUrl = new URL("/login", req.url);
    // Pass the intended destination so we can redirect back after login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
