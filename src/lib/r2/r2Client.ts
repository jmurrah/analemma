import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { serverEnv } from "@/config/env.server";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

const requireR2Config = (): R2Config => {
  const {
    CLOUDFLARE_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
  } = serverEnv;

  if (
    !CLOUDFLARE_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET
  ) {
    throw new Error("R2 environment variables are not fully configured");
  }

  return {
    accountId: CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
  };
};

let cachedClient: S3Client | null = null;

export const getR2Client = (): S3Client => {
  if (cachedClient) {
    return cachedClient;
  }

  const { accountId, accessKeyId, secretAccessKey } = requireR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedClient;
};

export const getR2Bucket = (): string => {
  const { bucket } = requireR2Config();
  return bucket;
};
