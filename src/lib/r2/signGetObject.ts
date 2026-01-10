import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Bucket, getR2Client } from "./r2Client";

export type SignedR2Url = {
  url: string;
  expiresAt: string;
};

export const signR2GetObjectUrl = async (
  key: string,
  expiresInSeconds: number,
): Promise<SignedR2Url> => {
  const client = getR2Client();
  const bucket = getR2Bucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });
  const expiresAt = new Date(
    Date.now() + expiresInSeconds * 1000,
  ).toISOString();

  return { url, expiresAt };
};
