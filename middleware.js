import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("sb-access-token")?.value; 

  const { pathname, searchParams } = req.nextUrl;

  // Restrict /auth/newpwd
  if (pathname.startsWith("/auth/newpwd")) {
    const resetToken = searchParams.get("token");

    // If no token in URL → redirect back to reset password request page
    if (!resetToken) {
      return NextResponse.redirect(new URL("/auth/resetpwd", req.url));
    }
  }
  
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
  // if (!token && pathname.startsWith("/dashboard")) {
  //   return NextResponse.redirect(new URL("/auth/login", req.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/:path*", "/dashboard/:path*"],
};
