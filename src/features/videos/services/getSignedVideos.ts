import "server-only";

import { unstable_cache } from "next/cache";
import { listR2Objects } from "@/lib/r2/listObjects";
import type { R2VideoObject } from "@/types/infra/r2";

export type SignedVideo = R2VideoObject & {
  signedUrl: string;
};

export type GetSignedVideosOptions = {
  pageSize?: number;
};

const LIST_REVALIDATE_SECONDS = 60; // 1 minute - check for new videos frequently

// Cache the video list with 1 min TTL to discover new videos quickly
const getCachedVideoList = unstable_cache(
  async (pageSize?: number) => {
    const result = await listR2Objects({ pageSize });
    return result.items;
  },
  ["video-list"],
  { revalidate: LIST_REVALIDATE_SECONDS },
);

// Build proxy URL - hides R2 credentials from frontend
const getProxyUrl = (key: string): string => {
  return `/api/videos/stream?key=${encodeURIComponent(key)}`;
};

export const getSignedVideos = async (
  options: GetSignedVideosOptions = {},
): Promise<SignedVideo[]> => {
  const items = await getCachedVideoList(options.pageSize);

  const limitedItems =
    typeof options.pageSize === "number" && options.pageSize > 0
      ? items.slice(0, options.pageSize)
      : items;

  return limitedItems.map((video) => ({
    ...video,
    signedUrl: getProxyUrl(video.key),
  }));
};
