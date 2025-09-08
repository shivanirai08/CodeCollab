import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("sb-access-token")?.value; 
  // supabase sets this cookie automatically if you enabled it
  // OR you can sync redux/localStorage user into cookie manually

  const { pathname } = req.nextUrl;

  // Public pages
  if (
    pathname.startsWith("/auth") ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    if (token && (pathname.startsWith("/auth") || pathname === "/")) {
      // logged in user trying to access login/signup/landing → redirect
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protected pages
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/:path*", "/dashboard/:path*"],
};
