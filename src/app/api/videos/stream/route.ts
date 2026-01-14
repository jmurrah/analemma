import { NextRequest, NextResponse } from "next/server";
import { signR2GetObjectUrl } from "@/lib/r2/signGetObject";
import { isValidVideoKey } from "@/features/videos/utils/validateVideoKey";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const URL_EXPIRY_SECONDS = 300; // Short-lived since we're proxying

/**
 * Proxies video requests to R2, hiding the R2 URL and credentials from the frontend.
 * Supports range requests for video seeking.
 */
export async function GET(request: NextRequest) {
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
    const { url } = await signR2GetObjectUrl(key, URL_EXPIRY_SECONDS);

    // Forward range header for video seeking support
    const rangeHeader = request.headers.get("range");
    const headers: HeadersInit = {};
    if (rangeHeader) {
      headers["Range"] = rangeHeader;
    }

    const response = await fetch(url, { headers });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: "Failed to fetch video" },
        { status: response.status },
      );
    }

    // Stream the response back to the client
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", "video/mp4");
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "private, max-age=3600");

    // Forward headers from R2 that iOS Safari needs for proper video handling
    const headersToForward = [
      "content-length",
      "content-range",
      "etag",
      "last-modified",
    ];

    for (const header of headersToForward) {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Failed to stream video", error);
    return NextResponse.json(
      { error: "Failed to stream video" },
      { status: 500 },
    );
  }
}
