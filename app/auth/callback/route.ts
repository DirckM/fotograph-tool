import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const ALLOWED_EMAILS = [
    "mickdelint@gmail.com",
    "dirckmulder20@gmail.com",
  ];

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
