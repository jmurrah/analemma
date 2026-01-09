import { AxiosInstance } from "axios";
import { RingApi } from "ring-client-api";

export type CameraRef = { id: string; name?: string };

export type DownloadPayload = {
  device_id: string;
  start_timestamp: number;
  end_timestamp: number;
  notification: boolean;
  custom_file_name?: string;
};

export type DownloadJob = {
  status?: string;
  result_url?: string;
  clip_id?: string;
  updated_at?: string;
};

export type RingContext = {
  ringApi: RingApi;
  api: AxiosInstance;
  hardwareId?: string;
  accessToken: string;
};
