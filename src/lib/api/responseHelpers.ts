import { NextResponse } from "next/server";

export const ok = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

export const err = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });
