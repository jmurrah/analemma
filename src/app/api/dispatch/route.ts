import { NextRequest, NextResponse } from "next/server";
import { SHARED_SECRET_HEADER, USER_EMAIL_HEADER } from "@/constants/headers";
import { serverEnv } from "@/config/env.server";

const ok = (body: unknown, status = 200) => NextResponse.json(body, { status });
const err = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(req: NextRequest) {
  const sharedSecret = req.headers.get(SHARED_SECRET_HEADER);
  const userEmail = req.headers.get(USER_EMAIL_HEADER);
  const expectedSecret = process.env.DISPATCH_SHARED_SECRET;
  const allowedEmails =
    process.env.DISPATCH_ALLOWED_EMAILS?.split(",").map((s) =>
      s.trim().toLowerCase(),
    ) ?? [];

  if (!expectedSecret || !sharedSecret || sharedSecret !== expectedSecret) {
    return err("unauthorized", 401);
  }

  if (!userEmail || !allowedEmails.includes(userEmail.toLowerCase())) {
    return err("forbidden", 403);
  }

  const body = await req.json();
  const { startIso, endIso, speed, outKey, cameraId, cameraName, clipType } =
    body ?? {};

  if (!startIso || !endIso) {
    return err("startIso and endIso are required");
  }

  const repo = process.env.GITHUB_REPO;
  const workflow = process.env.GITHUB_WORKFLOW ?? "ring-timelapse.yml";
  const token = process.env.GITHUB_DISPATCH_TOKEN;

  if (!repo || !token) {
    return err("server misconfigured", 500);
  }

  const [owner, name] = repo.split("/");

  if (!owner || !name) {
    return err("GITHUB_REPO must be owner/repo", 500);
  }

  const dispatchBody = {
    ref: "main",
    inputs: {
      startIso,
      endIso,
      speed: speed ?? "",
      outKey: outKey ?? "",
      cameraId: cameraId ?? serverEnv.RING_CAMERA_ID ?? "",
      cameraName: cameraName ?? "",
      clipType: clipType ?? "",
    },
  };

  const ghResp = await fetch(
    `https://api.github.com/repos/${owner}/${name}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dispatchBody),
    },
  );

  if (!ghResp.ok) {
    const text = await ghResp.text();
    return err(`dispatch failed: ${ghResp.status} ${text}`, ghResp.status);
  }

  return ok({ status: "queued" });
}
