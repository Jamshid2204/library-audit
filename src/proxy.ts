import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseAnonKey) {
    if (request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/books") ||
        request.nextUrl.pathname.startsWith("/readers") ||
        request.nextUrl.pathname.startsWith("/visits") ||
        request.nextUrl.pathname.startsWith("/reports") ||
        request.nextUrl.pathname.startsWith("/settings")) {
      return NextResponse.redirect(new URL("/login?error=configuration", request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isProtectedRoute =
    request.nextUrl.pathname === "/dashboard" ||
    ["/books", "/readers", "/visits", "/reports", "/settings"].some((path) =>
      request.nextUrl.pathname.startsWith(path),
    );

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (request.nextUrl.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/books/:path*", "/readers/:path*", "/visits/:path*", "/reports/:path*", "/settings/:path*"],
};
