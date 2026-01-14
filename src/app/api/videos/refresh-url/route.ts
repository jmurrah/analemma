import { NextResponse } from "next/server";
import { isValidVideoKey } from "@/features/videos/utils/validateVideoKey";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Returns a proxy URL for a video.
 * Used as fallback when video playback fails.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { error: "Missing key parameter" },
      { status: 400 },
    );
  }

  if (!isValidVideoKey(key)) {
    return NextResponse.json({ error: "Invalid video key" }, { status: 400 });
  }

  // Return proxy URL - keeps R2 credentials server-side
  const proxyUrl = `/api/videos/stream?key=${encodeURIComponent(key)}`;
  return NextResponse.json({ signedUrl: proxyUrl });
}
