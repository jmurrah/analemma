import axios from "axios";
import { RingApi } from "ring-client-api";
import {
  RING_API_BASE_URL,
  RING_API_LANG,
  RING_APP_BRAND,
  RING_MOBILE_USER_AGENT,
} from "@/constants/constants";
import { RingContext } from "@/types/infra/ring";
import { subscribeToRingToken } from "./tokenRefresh";

let ringContextPromise: Promise<RingContext> | null = null;

const buildRingContext = async (
  refreshToken = process.env.RING_REFRESH_TOKEN,
): Promise<RingContext> => {
  if (!refreshToken) {
    throw new Error("Missing RING_REFRESH_TOKEN in environment");
  }

  const ringApi = new RingApi({ refreshToken });
  await subscribeToRingToken(ringApi);

  const { access_token } = await ringApi.restClient.getCurrentAuth();
  const restClient = ringApi.restClient as unknown as {
    hardwareIdPromise?: Promise<string>;
    authConfig?: { hid?: string };
  };
  const hardwareId =
    (restClient.hardwareIdPromise && (await restClient.hardwareIdPromise)) ||
    restClient.authConfig?.hid;

  const api = axios.create({
    baseURL: RING_API_BASE_URL,
    timeout: 25_000,
    headers: {
      Authorization: `Bearer ${access_token}`,
      ...(hardwareId
        ? { Hardware_Id: hardwareId, hardware_id: hardwareId }
        : {}),
      "User-Agent": RING_MOBILE_USER_AGENT,
      "X-API-LANG": RING_API_LANG,
      app_brand: RING_APP_BRAND,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  return { ringApi, api, hardwareId, accessToken: access_token };
};

export const initRing = (refreshToken?: string) => {
  ringContextPromise = buildRingContext(refreshToken);
  return ringContextPromise;
};

export const getRing = () => {
  if (!ringContextPromise) {
    ringContextPromise = buildRingContext();
  }
  return ringContextPromise;
};
