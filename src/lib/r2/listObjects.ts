import "server-only";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { R2_VIDEO_EXTENSIONS } from "@/constants/r2";
import type {
  ListR2ObjectsParams,
  ListR2ObjectsResult,
  R2VideoObject,
} from "@/types/infra/r2";
import { getR2Bucket, getR2Client } from "./r2Client";

const VIDEO_EXTENSIONS = new Set(
  R2_VIDEO_EXTENSIONS.map((ext) => ext.toLowerCase()),
);

const hasAllowedExtension = (key: string): boolean => {
  const lower = key.toLowerCase();

  for (const ext of VIDEO_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return true;
    }
  }

  return false;
};

export const listR2Objects = async (
  params: ListR2ObjectsParams = {},
): Promise<ListR2ObjectsResult> => {
  const { prefix, continuationToken, pageSize } = params;
  const client = getR2Client();
  const bucket = getR2Bucket();
  const maxKeys =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : undefined;

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: maxKeys,
    }),
  );

  const contents = response.Contents ?? [];
  const items: R2VideoObject[] = contents
    .filter(
      (
        entry,
      ): entry is {
        Key: string;
        Size: number;
        LastModified: Date;
        ETag?: string;
      } =>
        typeof entry?.Key === "string" &&
        entry.Key.length > 0 &&
        entry.LastModified instanceof Date &&
        typeof entry.Size === "number" &&
        entry.Size > 0,
    )
    .filter((entry) => hasAllowedExtension(entry.Key))
    .map((entry) => ({
      key: entry.Key,
      size: entry.Size,
      lastModified: entry.LastModified.toISOString(),
      etag: entry.ETag?.replaceAll('"', ""),
    }))
    .sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
    );

  return {
    items,
    nextContinuationToken: response.NextContinuationToken ?? undefined,
  };
};
