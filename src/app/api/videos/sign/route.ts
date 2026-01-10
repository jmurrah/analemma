import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { authEnv } from "@/config/env.server";
import { isValidVideoKey } from "@/features/videos/utils/validateVideoKey";
import { headR2Object } from "@/lib/r2/headObject";
import { signR2GetObjectUrl } from "@/lib/r2/signGetObject";
import { parseAllowlist } from "@/types/auth";

export const dynamic = "force-dynamic";

const allowedEmails = parseAllowlist(authEnv.ALLOWED_EMAILS);
const URL_EXPIRY_SECONDS = 86_400;

const ok = (body: unknown, status = 200) => NextResponse.json(body, { status });
const err = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key")?.trim() ?? "";

  if (!isValidVideoKey(key)) {
    return err("invalid key", 400);
  }

  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!session || !email) {
    return err("unauthorized", 401);
  }

  if (!allowedEmails.includes(email)) {
    return err("forbidden", 403);
  }

  try {
    const exists = await headR2Object(key);
    if (!exists) {
      return err("not found", 404);
    }

    const signed = await signR2GetObjectUrl(key, URL_EXPIRY_SECONDS);
    return ok(signed);
  } catch (error) {
    console.error("Failed to sign R2 object", { key, error });
    return err("server error", 500);
  }
}
