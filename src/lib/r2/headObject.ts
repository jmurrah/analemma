import "server-only";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getR2Bucket, getR2Client } from "./r2Client";

type S3Error = {
  $metadata?: {
    httpStatusCode?: number;
  };
  name?: string;
};

export const headR2Object = async (key: string): Promise<boolean> => {
  const client = getR2Client();
  const bucket = getR2Bucket();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return true;
  } catch (error: unknown) {
    const typedError = error as S3Error;
    const status = typedError?.$metadata?.httpStatusCode;
    if (status === 404 || typedError?.name === "NotFound") {
      return false;
    }
    throw error;
  }
};
