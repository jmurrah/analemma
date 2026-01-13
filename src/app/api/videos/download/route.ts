import { NextResponse } from "next/server";
import { signR2GetObjectUrl } from "@/lib/r2/signGetObject";
import { isValidVideoKey } from "@/features/videos/utils/validateVideoKey";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
    // Get signed URL for the video
    const { url } = await signR2GetObjectUrl(key, 300); // 5 minute expiry

    // Fetch the video from R2
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`);
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    // Check if this is a download request or view request
    const forceDownload = searchParams.get("download") === "1";

    // Return the video with appropriate headers
    // Use 'inline' to allow viewing in browser, rely on download attribute for actual downloads
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": forceDownload
          ? `attachment; filename="${key}"`
          : `inline; filename="${key}"`,
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Failed to download video", error);
    return NextResponse.json(
      { error: "Failed to download video" },
      { status: 500 },
    );
  }
}
