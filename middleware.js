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

  const isAuthPage = path.startsWith("/auth") || path === "/";
  const isProtectedPage =
    path.startsWith("/dashboard") ||
    path.startsWith("/projects") ||
    path.startsWith("/messages") ||
    path.startsWith("/settings");

  // user not logged in → redirect to /
  if (!user && isProtectedPage) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  // user is logged in → prevent access to / or /auth/*
  if (user && isAuthPage) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }


  return response;
}

// Matcher: apply middleware to all relevant routes
export const config = {
  matcher: [
    "/",
    "/auth/:path*",
    "/dashboard/:path*",
    "/project/:path*",
    "/projects/:path*",
    "/messages/:path*",
    "/settings/:path*",
  ],
};
