import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const response = await updateSession(request);
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  if (isApi) {
    const duration = Date.now() - start;
    console.log(
      `[API] ${request.method} ${request.nextUrl.pathname}${request.nextUrl.search} ${response.status} ${duration}ms`
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
