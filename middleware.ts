import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getAdminCookieValue } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.searchParams.get("next") || "/admin");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin")) {
    let expected = "";
    try { expected = await getAdminCookieValue(); } catch { expected = ""; }
    const session = request.cookies.get(SESSION_COOKIE)?.value;
    if (!expected || session !== expected) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
