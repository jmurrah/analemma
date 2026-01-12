import path from "node:path";
import { getRing } from "./client";
import {
  defaultPollIntervalMs,
  defaultPollTimeoutMs,
  buildCustomFileName,
  buildPayload,
  downloadResultToFile,
} from "./helpers";
import {
  CameraRef,
  DownloadJob,
  DownloadPayload,
  RingContext,
} from "@/types/infra/ring";
import type { HttpMethod } from "@/types/http";

export async function accountRequest<T>(options: {
  ring: RingContext;
  method: HttpMethod;
  path: string;
  json?: object;
}): Promise<T> {
  const response = await options.ring.api.request<T>({
    url: options.path,
    method: options.method,
    data: options.json,
  });
  return response.data;
}

export function createDownloadJob(
  ring: RingContext,
  payload: DownloadPayload,
): Promise<DownloadJob> {
  return accountRequest<DownloadJob>({
    ring,
    method: "PUT",
    path: "/share_service/v3/downloads",
    json: payload,
  });
}

export async function pollDownloadJob(
  ring: RingContext,
  payload: DownloadPayload,
  intervalMs = defaultPollIntervalMs,
  timeoutMs = defaultPollTimeoutMs,
): Promise<DownloadJob> {
  const started = Date.now();
  let attempt = 0;
  let job: DownloadJob = await createDownloadJob(ring, payload);

  while (
    Date.now() - started < timeoutMs &&
    attempt < Math.max(1, Math.floor(timeoutMs / intervalMs))
  ) {
    attempt += 1;

    if (job.status && job.status !== "pending" && job.result_url) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    job = await accountRequest<DownloadJob>({
      ring,
      method: "POST",
      path: "/share_service/v3/downloads",
      json: payload,
    });

    if (job.status && job.status !== "pending" && job.result_url) {
      break;
    }
  }

  return job;
}

export async function downloadRecordingWindow(options: {
  camera: CameraRef;
  start: number;
  end: number;
  fileName?: string;
  outputDir?: string;
  ring?: RingContext;
}): Promise<{
  destination: string;
  meta: { bytes: number; contentType: string | undefined };
  job: DownloadJob;
}> {
  const ring = options.ring ?? (await getRing());
  const payload = buildPayload({
    deviceId: options.camera.id,
    deviceName: options.camera.name,
    start: options.start,
    end: options.end,
    fileName: options.fileName,
  });

  const job = await pollDownloadJob(ring, payload);
  if (!job.result_url) {
    throw new Error("Download job did not return a result_url");
  }

  const resolvedDir =
    options.outputDir ?? path.resolve(process.cwd(), "downloads");
  const fileName =
    payload.custom_file_name ??
    buildCustomFileName(options.camera.name ?? "RingCamera", options.end);
  const destination = path.join(resolvedDir, `${fileName}.mp4`);
  const meta = await downloadResultToFile(job.result_url, destination);

  return { destination, meta, job };
}
