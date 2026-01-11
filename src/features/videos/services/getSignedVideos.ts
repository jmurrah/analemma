import "server-only";

import { unstable_cache } from "next/cache";
import { signR2GetObjectUrl } from "@/lib/r2/signGetObject";
import { listR2Objects } from "@/lib/r2/listObjects";
import type { R2VideoObject } from "@/types/infra/r2";

export type SignedVideo = R2VideoObject & {
  signedUrl: string;
  signedUrlExpiresAt: string;
};

export type GetSignedVideosOptions = {
  pageSize?: number;
};

const URL_EXPIRY_SECONDS = 86_400; // 24 hours
const LIST_REVALIDATE_SECONDS = 60; // 1 minute - check for new videos frequently
const URL_REVALIDATE_SECONDS = 86_400; // 24 hours

// Cache the video list with 1 min TTL to discover new videos quickly
const getCachedVideoList = unstable_cache(
  async (pageSize?: number) => {
    const result = await listR2Objects({ pageSize });
    return result.items;
  },
  ["video-list"],
  { revalidate: LIST_REVALIDATE_SECONDS },
);

// Cache signed URLs with 24h TTL per video key
const getCachedSignedUrl = (key: string) =>
  unstable_cache(
    async () => {
      const { url, expiresAt } = await signR2GetObjectUrl(
        key,
        URL_EXPIRY_SECONDS,
      );
      return { url, expiresAt };
    },
    ["signed-url", key],
    { revalidate: URL_REVALIDATE_SECONDS },
  )();

export const getSignedVideos = async (
  options: GetSignedVideosOptions = {},
): Promise<SignedVideo[]> => {
  const items = await getCachedVideoList(options.pageSize);

  const limitedItems =
    typeof options.pageSize === "number" && options.pageSize > 0
      ? items.slice(0, options.pageSize)
      : items;

  const signed = await Promise.all(
    limitedItems.map(async (video) => {
      const { url, expiresAt } = await getCachedSignedUrl(video.key);
      return {
        ...video,
        signedUrl: url,
        signedUrlExpiresAt: expiresAt,
      };
    }),
  );

  return signed;
};
