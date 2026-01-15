import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { unlink, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import { CameraRef, DownloadJob, RingContext } from "@/types/infra/ring";
import {
  buildPayload,
  defaultPollIntervalMs,
  defaultPollTimeoutMs,
} from "@/lib/ring/helpers";
import { pollDownloadJob } from "@/lib/ring/downloadClip";
import { getRing } from "@/lib/ring/client";
import { getTimes } from "@/utils/astronomy/solarLunar";
import { CAMERA_LATITUDE, CAMERA_LONGITUDE } from "@/constants/location";

const MINUTES_BEFORE_SUNSET = 20;
const MINUTES_AFTER_SUNSET = 10;
const DEFAULT_SPEED = 40;

type Inputs = {
  speed: number;
  cameraId?: string;
};

function parseArgs(): Inputs {
  const argMap = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split("=");
    if (key && value) {
      argMap.set(key.replace(/^--/, ""), value);
    }
  }

  const speedRaw =
    argMap.get("speed") ?? process.env.SPEED ?? String(DEFAULT_SPEED);
  const speed = Number(speedRaw);
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error("speed must be a positive number");
  }

  return {
    speed,
    cameraId: argMap.get("cameraId") ?? process.env.RING_CAMERA_ID,
  };
}

async function selectCamera(
  ring: RingContext,
  cameraId?: string,
): Promise<CameraRef> {
  const cameras = await ring.ringApi.getCameras();
  if (!cameras.length) {
    throw new Error("No Ring cameras found");
  }
  if (cameraId) {
    const found = cameras.find((cam) => String(cam.id) === String(cameraId));
    if (found) {
      return { id: String(found.id), name: found.name };
    }
  }
  const first = cameras[0];
  return { id: String(first.id), name: first.name };
}

/**
 * Gets the most recent sunset time.
 * If current time is before today's sunset, returns yesterday's sunset.
 * If current time is after today's sunset, returns today's sunset.
 */
function getMostRecentSunset(now: Date, lat: number, lng: number): Date {
  const todayTimes = getTimes(now, lat, lng);
  const todaySunset = todayTimes.sunset as Date;

  if (now >= todaySunset) {
    return todaySunset;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTimes = getTimes(yesterday, lat, lng);
  return yesterdayTimes.sunset as Date;
}

function formatDateYYYYMMDD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function calculateSunsetWindow(): {
  start: Date;
  end: Date;
  outKey: string;
} {
  const now = new Date();
  const sunset = getMostRecentSunset(now, CAMERA_LATITUDE, CAMERA_LONGITUDE);

  const start = new Date(sunset.getTime() - MINUTES_BEFORE_SUNSET * 60 * 1000);
  const end = new Date(sunset.getTime() + MINUTES_AFTER_SUNSET * 60 * 1000);
  const outKey = `${formatDateYYYYMMDD(sunset)}_sunset.mp4`;

  return { start, end, outKey };
}

function spawnFfmpeg(
  inputUrl: string,
  speed: number,
  outputPath: string,
): {
  waitForClose: () => Promise<void>;
  process: ReturnType<typeof spawn>;
} {
  const args = [
    "-i",
    inputUrl,
    "-vf",
    `setpts=PTS/${speed},scale=-2:1080`,
    "-vsync",
    "vfr", // Variable frame rate: keep ALL frames, no drops due to timestamp gaps
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p", // Ensures widest iOS compatibility
    "-movflags",
    "+faststart", // Move moov atom to front for fast iPhone preview/scrubbing
    "-an",
    "-f",
    "mp4",
    "-y", // Overwrite output file if exists
    outputPath,
  ];

  const ffmpeg = spawn("ffmpeg", args, {
    stdio: ["ignore", "ignore", "inherit"],
  });

  const waitForClose = () =>
    new Promise<void>((resolve, reject) => {
      let exitCode: number | null = null;

      ffmpeg.on("exit", (code) => {
        exitCode = code;
      });

      // Wait for 'close' instead of 'exit' - ensures all stdio streams are closed
      ffmpeg.on("close", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`ffmpeg closed with code ${code ?? exitCode}`));
        } else {
          resolve();
        }
      });

      ffmpeg.on("error", (err) => {
        reject(new Error(`ffmpeg process error: ${err.message}`));
      });
    });

  return { waitForClose, process: ffmpeg };
}

function createR2Client() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 credentials (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

async function uploadFileToR2(filePath: string, key: string) {
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error("Missing R2_BUCKET");
  }

  // Get file size for Content-Length header
  const fileStats = await stat(filePath);
  console.log("File size:", fileStats.size, "bytes");

  const client = createR2Client();
  const fileStream = createReadStream(filePath);

  try {
    const uploader = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fileStream,
        ContentType: "video/mp4",
        ContentLength: fileStats.size,
      },
    });

    await uploader.done();
  } finally {
    // Ensure stream is closed even on error
    fileStream.destroy();
  }
}

async function ensureResultUrl(
  ring: RingContext,
  camera: CameraRef,
  start: Date,
  end: Date,
): Promise<DownloadJob> {
  const payload = buildPayload({
    deviceId: camera.id,
    deviceName: camera.name,
    start: start.getTime(),
    end: end.getTime(),
  });
  const job = await pollDownloadJob(
    ring,
    payload,
    defaultPollIntervalMs,
    defaultPollTimeoutMs,
  );

  if (!job.result_url) {
    throw new Error("Download job did not return a result_url");
  }

  return job;
}

async function main() {
  const inputs = parseArgs();
  const { start, end, outKey } = calculateSunsetWindow();

  console.log("Sunset timelapse job", {
    start: start.toISOString(),
    end: end.toISOString(),
    speed: inputs.speed,
    outKey,
    location: { lat: CAMERA_LATITUDE, lng: CAMERA_LONGITUDE },
  });

  const ring = await getRing();
  const camera = await selectCamera(ring, inputs.cameraId);
  console.log("Using camera", camera);

  const job = await ensureResultUrl(ring, camera, start, end);
  console.log("Download job ready", { clip_id: job.clip_id });

  console.log("Uploading to R2 key", outKey);

  if (!job.result_url) {
    throw new Error("Download job did not return a result_url");
  }

  // Create unique temp file path to avoid collisions
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const tempFilePath = join(tmpdir(), `${outKey}.${uniqueSuffix}.tmp`);
  console.log("Temp file path:", tempFilePath);

  const { waitForClose, process: ffmpegProcess } = spawnFfmpeg(
    job.result_url,
    inputs.speed,
    tempFilePath,
  );

  let encodingSucceeded = false;
  let uploadSucceeded = false;

  try {
    // Wait for ffmpeg to complete encoding
    console.log("Waiting for ffmpeg to finish encoding...");
    await waitForClose();
    console.log("ffmpeg encoding completed successfully");
    encodingSucceeded = true;

    // Upload the file to R2
    console.log("Uploading to R2 key", outKey);
    await uploadFileToR2(tempFilePath, outKey);
    console.log("Upload complete", { key: outKey });
    uploadSucceeded = true;

    // Success - return and let Node exit naturally (don't use process.exit!)
    return;
  } catch (error) {
    console.error("Error during processing:", error);

    // Kill ffmpeg if still running
    if (ffmpegProcess.exitCode === null) {
      console.warn("Killing ffmpeg process");
      ffmpegProcess.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (ffmpegProcess.exitCode === null) {
        ffmpegProcess.kill("SIGKILL");
      }
    }

    throw error;
  } finally {
    // Only cleanup temp file if upload succeeded
    // Keep file on upload failure for inspection/retry
    if (uploadSucceeded) {
      try {
        await unlink(tempFilePath);
        console.log("Temp file cleaned up");
      } catch (cleanupError) {
        console.warn("Failed to clean up temp file:", cleanupError);
      }
    } else if (encodingSucceeded) {
      console.log("Temp file preserved for inspection/retry:", tempFilePath);
    }
  }
}

main().catch((error) => {
  console.error("run-timelapse failed", error);
  process.exit(1);
});
