import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  const { nextUrl, cookies } = request;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = nextUrl.pathname;
  const referer = request.headers.get("referer");

  const isAuthPage = path.startsWith("/auth") || path === "/";
  const isProtectedPage =
    path.startsWith("/dashboard") ||
    path.startsWith("/projects") ||
    path.startsWith("/messages") ||
    path.startsWith("/settings");

  // #region agent log
  const isUnauthedSensitiveRoute =
    path.startsWith("/project") ||
    path.startsWith("/createproject") ||
    path.startsWith("/joinproject");
  if (!user && isUnauthedSensitiveRoute) {
    fetch("http://127.0.0.1:7791/ingest/772f312a-003d-4c15-b14f-f4866f57196a", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "ae4fb6",
      },
      body: JSON.stringify({
        sessionId: "ae4fb6",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "middleware.js:auth-gap",
        message: "Unauthenticated access allowed to sensitive route",
        data: { path, isProtectedPage, hasUser: Boolean(user) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  // Special handling for restricted auth pages
  const restrictedAuthPages = [
    "/auth/verifyotp",
    "/auth/resetpwd",
    "/auth/newpwd",
  ];

  // Check if current path is a restricted auth page
  if (restrictedAuthPages.includes(path)) {
    // For /auth/newpwd - must have 'code' parameter in URL (from email link)
    if (path === "/auth/newpwd") {
      const hasCode = nextUrl.searchParams.has("code");
      const hasValidSession = user !== null;

      // Allow if code is present OR user has valid session (for password reset flow)
      if (!hasCode && !hasValidSession) {
        const redirectUrl = nextUrl.clone();
        redirectUrl.pathname = "/auth/login";
        return NextResponse.redirect(redirectUrl);
      }
    }
    // For /auth/verifyotp - must come from signup page
    else if (path === "/auth/verifyotp") {
      // Check if referer is from signup or if there's an email in searchParams
      const isFromSignup = referer?.includes("/auth/signup");
      const hasEmail = nextUrl.searchParams.has("email");

      if (!isFromSignup && !hasEmail) {
        const redirectUrl = nextUrl.clone();
        redirectUrl.pathname = "/auth/login";
        return NextResponse.redirect(redirectUrl);
      }
    }
    // For /auth/resetpwd - must come from login page or have valid referer
    else if (path === "/auth/resetpwd") {
      const isFromLogin = referer?.includes("/auth/login");
      const isFromWithinApp = referer?.includes(nextUrl.origin);

      // Allow if coming from login or from within the app
      if (!isFromLogin && !isFromWithinApp) {
        const redirectUrl = nextUrl.clone();
        redirectUrl.pathname = "/auth/login";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // user not logged in → redirect to /
  if (!user && isProtectedPage) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  // user is logged in → prevent access to / or /auth/*
  if (user && isAuthPage && !restrictedAuthPages.includes(path)) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

// Matcher: apply middleware to relevant routes only (exclude static files, API routes, and _next)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (public files)
     * - images and other static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js)$).*)",
    "/",
    "/auth/:path*",
    "/dashboard/:path*",
    "/project/:path*",
    "/projects/:path*",
    "/messages/:path*",
    "/settings/:path*",
  ],
};
