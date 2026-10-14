import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const APP_ROUTES = ["/dashboard", "/contacts", "/templates", "/history", "/settings"];
const AUTH_ROUTES = ["/login", "/signup"];

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("wishly_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

// Optimistic redirects only — every page and action still checks the session itself.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApp = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const isAuth = AUTH_ROUTES.includes(pathname);
  if (!isApp && !isAuth) return NextResponse.next();

  const signedIn = await hasValidSession(request);
  if (isApp && !signedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (isAuth && signedIn) return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/contacts/:path*", "/templates/:path*", "/history/:path*", "/settings/:path*", "/login", "/signup"],
};
