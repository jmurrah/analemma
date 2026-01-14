import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { signR2GetObjectUrl } from "@/lib/r2/signGetObject";
import { isValidVideoKey } from "@/features/videos/utils/validateVideoKey";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const URL_EXPIRY_SECONDS = 86_400; // 24 hours

/**
 * Generates a fresh signed URL for a video, bypassing cache.
 * Used when cached signed URLs have expired.
 * Also invalidates the server-side cache so future requests get fresh URLs.
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

  try {
    // Invalidate the stale server-side cache for this video's signed URL
    revalidateTag(`signed-url-${key}`, "max");

    const { url, expiresAt } = await signR2GetObjectUrl(
      key,
      URL_EXPIRY_SECONDS,
    );
    return NextResponse.json({ signedUrl: url, expiresAt });
  } catch (error) {
    console.error("Failed to generate fresh signed URL", error);
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 },
    );
  }
}
