// Manual pipeline test script: download 1 minute from Ring, speed up, upload to R2.
// Usage: npm run pipeline:test (requires ffmpeg on PATH)
// Env required: RING_REFRESH_TOKEN, R2_ACCESS_KEY_ID/SECRET, R2_ACCOUNT_ID, R2_BUCKET

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadRecordingWindow } from "./src/lib/ring/downloadClip.ts";
import { getRing } from "./src/lib/ring/client.ts";
import { ensureDir } from "./src/lib/ring/helpers.ts";
import { getR2Bucket, getR2Client } from "./src/lib/r2/r2Client.ts";

type CameraRef = { id: string; name?: string };

const MINUTE_MS = 60_000;
const SPEED_FACTOR = 2;
// Fixed test window: Jan 9th @ 5:45pm local time, 60 seconds long.
const TEST_END_ISO = "2026-01-09T17:45:00";

const pickCamera = async (): Promise<CameraRef> => {
  const ring = await getRing();
  const cameras = await ring.ringApi.getCameras();
  if (!cameras.length)
    throw new Error("No cameras available on this Ring account.");

  const envCameraId = process.env.CAMERA_ID;
  if (envCameraId) {
    const match = cameras.find((cam) => `${cam.id}` === envCameraId);
    if (match) return { id: `${match.id}`, name: match.name };
    throw new Error(`CAMERA_ID ${envCameraId} not found among Ring cameras.`);
  }

  const first = cameras[0];
  return { id: `${first.id}`, name: first.name };
};

const deleteIfExists = (filePath: string) => {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // ignore cleanup errors
  }
};

const speedUpVideo = async (
  inputPath: string,
  outputPath: string,
  factor = SPEED_FACTOR,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-filter_complex",
      `[0:v]setpts=${1 / factor}*PTS[v]`,
      "-map",
      "[v]",
      "-an",
      "-preset",
      "veryfast",
      outputPath,
    ];

    const proc = spawn("ffmpeg", args, { stdio: "inherit" });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
    proc.on("error", (err) => reject(err));
  });

const uploadToR2 = async (filePath: string, key: string) => {
  const client = getR2Client();
  const bucket = getR2Bucket();
  const stream = fs.createReadStream(filePath);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: stream,
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
};

const buildR2Key = (endMs: number, cameraName?: string) => {
  const end = new Date(endMs);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(
    end.getUTCDate(),
  )}`;
  const safeName = (cameraName ?? "camera")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return `${stamp}_dkbw${safeName || "camera"}.mp4`;
};

const run = async () => {
  const camera = await pickCamera();
  console.log(`Using camera: ${camera.name ?? camera.id}`);

  const end =
    TEST_END_ISO && !Number.isNaN(Date.parse(TEST_END_ISO))
      ? new Date(TEST_END_ISO).getTime()
      : Date.now();
  const start = end - MINUTE_MS;

  const workDir = path.resolve(process.cwd(), "tmp", "pipeline-test");
  ensureDir(workDir);

  console.log("Downloading 1 minute clip...");
  const { destination } = await downloadRecordingWindow({
    camera,
    start,
    end,
    outputDir: workDir,
  });

  const spedUpPath = path.join(
    workDir,
    `${path.parse(destination).name}-fast.mp4`,
  );

  console.log("Speeding up video (2x, video only)...");
  await speedUpVideo(destination, spedUpPath, SPEED_FACTOR);

  const key = `pipeline-tests/${buildR2Key(end, camera.name)}`;
  console.log(`Uploading to R2 as ${key}...`);
  await uploadToR2(spedUpPath, key);

  deleteIfExists(destination);
  deleteIfExists(spedUpPath);

  console.log("Done.");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
