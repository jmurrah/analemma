import { spawn } from "node:child_process";
import { Readable } from "node:stream";
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
import { MONTH_NAMES } from "@/constants/constants";

type Inputs = {
  startIso: string;
  endIso: string;
  speed: number;
  cameraId?: string;
  cameraName?: string;
  outKey?: string;
  clipType?: string;
};

function parseArgs(): Inputs {
  const argMap = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split("=");
    if (key && value) {
      argMap.set(key.replace(/^--/, ""), value);
    }
  }

  const startIso = argMap.get("startIso") ?? process.env.START_ISO;
  const endIso = argMap.get("endIso") ?? process.env.END_ISO;

  const speedRaw = argMap.get("speed") ?? process.env.SPEED ?? "30";
  const speed = Number(speedRaw);
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error("speed must be a positive number");
  }

  return {
    startIso: startIso ?? "",
    endIso: endIso ?? "",
    speed,
    cameraId: argMap.get("cameraId") ?? process.env.CAMERA_ID,
    cameraName: argMap.get("cameraName") ?? process.env.CAMERA_NAME,
    outKey: argMap.get("outKey") ?? process.env.OUT_KEY,
    clipType: argMap.get("clipType") ?? process.env.CLIP_TYPE,
  };
}

async function selectCamera(
  ring: RingContext,
  cameraId?: string,
  cameraName?: string,
): Promise<CameraRef> {
  const cameras = await ring.ringApi.getCameras();
  if (!cameras.length) {
    throw new Error("No Ring cameras found");
  }
  if (cameraId) {
    const found = cameras.find((cam) => String(cam.id) === String(cameraId));
    if (found) {
      return { id: String(found.id), name: cameraName ?? found.name };
    }
  }
  const first = cameras[0];
  return { id: String(first.id), name: cameraName ?? first.name };
}

function deriveKey(
  start: Date,
  end: Date,
  clipType: string | undefined,
  speed: number,
  providedKey?: string,
): string {
  if (providedKey) {
    return providedKey;
  }

  const year = start.getUTCFullYear();
  const monthName = MONTH_NAMES[start.getUTCMonth()];
  const datePart = [
    start.getUTCFullYear(),
    String(start.getUTCMonth() + 1).padStart(2, "0"),
    String(start.getUTCDate()).padStart(2, "0"),
  ].join("");
  const durationMs = end.getTime() - start.getTime();
  const kind =
    clipType || (durationMs >= 20 * 60 * 60 * 1000 ? "daily" : "custom");
  const speedTag = `${speed}x`;
  const filename = `ring-${kind}-${datePart}-${speedTag}.mp4`;

  return `${year}/${monthName}/${filename}`;
}

function spawnFfmpeg(inputUrl: string, speed: number): Readable {
  const args = [
    "-i",
    inputUrl,
    "-vf",
    `scale=-2:1080,setpts=PTS/${speed}`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-movflags",
    "+faststart",
    "-an",
    "-f",
    "mp4",
    "pipe:1",
  ];

  const ffmpeg = spawn("ffmpeg", args, {
    stdio: ["ignore", "pipe", "inherit"],
  });

  if (!ffmpeg.stdout) {
    throw new Error("ffmpeg did not produce a stdout stream");
  }

  ffmpeg.on("exit", (code) => {
    if (code !== 0) {
      console.error(`ffmpeg exited with code ${code}`);
    }
  });

  return ffmpeg.stdout;
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

async function uploadStreamToR2(body: Readable, key: string) {
  const bucket = process.env.R2_BUCKET;

  if (!bucket) {
    throw new Error("Missing R2_BUCKET");
  }

  const client = createR2Client();
  const uploader = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "video/mp4",
    },
  });

  await uploader.done();
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
  const hasStart = inputs.startIso && inputs.startIso.length > 0;
  const hasEnd = inputs.endIso && inputs.endIso.length > 0;

  let start: Date;
  let end: Date;

  if (hasStart && hasEnd) {
    start = new Date(inputs.startIso);
    end = new Date(inputs.endIso);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid startIso or endIso");
    }
  } else if (!hasStart && !hasEnd) {
    const endDefault = new Date();
    const startDefault = new Date(endDefault.getTime() - 30 * 60 * 1000);

    start = startDefault;
    end = endDefault;
  } else {
    throw new Error("Provide both startIso and endIso or neither");
  }

  console.log("Starting timelapse job", {
    start: start.toISOString(),
    end: end.toISOString(),
    speed: inputs.speed,
  });

  const ring = await getRing();
  const camera = await selectCamera(ring, inputs.cameraId, inputs.cameraName);
  console.log("Using camera", camera);

  const job = await ensureResultUrl(ring, camera, start, end);
  console.log("Download job ready", { clip_id: job.clip_id });

  const key = deriveKey(
    start,
    end,
    inputs.clipType,
    inputs.speed,
    inputs.outKey,
  );
  console.log("Uploading to R2 key", key);

  if (!job.result_url) {
    throw new Error("Download job did not return a result_url");
  }

  const ffmpegStream = spawnFfmpeg(job.result_url, inputs.speed);

  await uploadStreamToR2(ffmpegStream, key);
  console.log("Upload complete", { key });
}

main().catch((error) => {
  console.error("run-timelapse failed", error);
  process.exitCode = 1;
});
