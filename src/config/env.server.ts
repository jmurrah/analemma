import { z } from "zod";
import { LocationEnv } from "@/types/domain/location";

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().min(1, "NEXTAUTH_URL is required"),
  ALLOWED_EMAILS: z.string().min(1, "ALLOWED_EMAILS is required"),
  RING_REFRESH_TOKEN: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  LOCATION: z.string().min(1, "LOCATION is required"),
  LATITUDE: z.coerce
    .number()
    .min(-90, "LATITUDE must be between -90 and 90")
    .max(90, "LATITUDE must be between -90 and 90"),
  LONGITUDE: z.coerce
    .number()
    .min(-180, "LONGITUDE must be between -180 and 180")
    .max(180, "LONGITUDE must be between -180 and 180"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Environment validation error",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment variables");
}

export const serverEnv = parsed.data;
export const authEnv = serverEnv;

export const locationEnv: LocationEnv = {
  label: serverEnv.LOCATION,
  latitude: serverEnv.LATITUDE,
  longitude: serverEnv.LONGITUDE,
};
