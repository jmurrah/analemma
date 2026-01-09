import axios, { AxiosInstance } from "axios";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_POLL_TIMEOUT_MS,
  RING_API_BASE_URL,
  RING_API_LANG,
  RING_APP_BRAND,
  RING_MOBILE_USER_AGENT,
} from "@/constants/constants";
import { DownloadPayload } from "@/types/infra/ring";

export const buildCustomFileName = (
  deviceName: string,
  endTimestamp: number,
  override?: string,
): string => {
  if (override) {
    return override;
  }

  const date = new Date(endTimestamp);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const stamp = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate(),
  )}_${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
  const safeName = deviceName.trim().replace(/\s+/g, "") || "RingCamera";

  return `Ring_${safeName}_${stamp}`;
};

export const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const parseFileNameFromUrl = (url: string, header?: string): string => {
  if (header) {
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(
      header,
    );
    const value = match?.[1] ?? match?.[2];

    if (value) {
      return decodeURIComponent(value);
    }
  }

  const urlPath = new URL(url).pathname;
  const tail = urlPath.split("/").filter(Boolean).pop();

  return tail || "ring-download.mp4";
};

export const createStreamAxios = (): AxiosInstance =>
  axios.create({
    timeout: 30_000,
    responseType: "stream",
  });

export const downloadResultToFile = async (
  resultUrl: string,
  destination: string,
) => {
  ensureDir(path.dirname(destination));

  const axios = createStreamAxios();
  const response = await axios.get(resultUrl);

  await pipeline(response.data, fs.createWriteStream(destination));

  return {
    bytes: Number(response.headers["content-length"]),
    contentType: response.headers["content-type"],
  };
};

export const buildPayload = (options: {
  deviceId: string;
  deviceName?: string;
  start: number;
  end: number;
  fileName?: string;
}): DownloadPayload => {
  const payload: DownloadPayload = {
    device_id: options.deviceId,
    start_timestamp: options.start,
    end_timestamp: options.end,
    notification: false,
  };

  const name =
    options.fileName && options.fileName.trim().length > 0
      ? options.fileName
      : buildCustomFileName(
          options.deviceName ?? "RingCamera",
          options.end,
          options.fileName,
        );

  if (name) {
    payload.custom_file_name = name;
  }

  return payload;
};

export const defaultPollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
export const defaultPollTimeoutMs = DEFAULT_POLL_TIMEOUT_MS;

export const buildApiHeaders = (auth: {
  accessToken: string;
  hardwareId?: string;
}) => ({
  Authorization: `Bearer ${auth.accessToken}`,
  ...(auth.hardwareId
    ? { Hardware_Id: auth.hardwareId, hardware_id: auth.hardwareId }
    : {}),
  "User-Agent": RING_MOBILE_USER_AGENT,
  "X-API-LANG": RING_API_LANG,
  app_brand: RING_APP_BRAND,
  Accept: "application/json",
  "Content-Type": "application/json",
});

export const createRingAxios = (auth: {
  accessToken: string;
  hardwareId?: string;
}) =>
  axios.create({
    baseURL: RING_API_BASE_URL,
    timeout: 25_000,
    headers: buildApiHeaders(auth),
  });
