import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PinterestImage {
  width: number;
  height: number;
  url: string;
}

interface PinterestPin {
  id: string;
  description: string | null;
  link: string | null;
  media: {
    images: Record<string, PinterestImage>;
  };
}

function getLargestImageUrl(images: Record<string, PinterestImage>): string {
  if (images.original) {
    return images.original.url;
  }

  let largest: PinterestImage | null = null;
  for (const img of Object.values(images)) {
    if (!largest || img.width * img.height > largest.width * largest.height) {
      largest = img;
    }
  }

  return largest?.url ?? "";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 });
  }

  const token = process.env.PINTEREST_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({
      results: [],
      fallback: true,
      message: "Pinterest API not configured. Use manual upload.",
    });
  }

  try {
    const url = `https://api.pinterest.com/v5/search/pins?query=${encodeURIComponent(q)}&page_size=20`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Pinterest API error: ${response.status}`, details: errorBody },
        { status: 500 },
      );
    }

    const data = await response.json();
    const results = (data.items ?? []).map((pin: PinterestPin) => ({
      id: pin.id,
      image_url: getLargestImageUrl(pin.media?.images ?? {}),
      description: pin.description ?? null,
      link: pin.link ?? null,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
