import { NextResponse } from "next/server";
import { listR2Objects } from "@/lib/r2/listObjects";

export const revalidate = 86_400; // seconds (24h)
export const dynamic = "force-static";

const MAX_PAGE_SIZE = 500;

const parsePageSize = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.min(parsed, MAX_PAGE_SIZE);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const prefix = searchParams.get("prefix") || undefined;
  const continuationToken = searchParams.get("continuationToken") || undefined;
  const pageSize = parsePageSize(searchParams.get("pageSize"));

  const result = await listR2Objects({
    prefix,
    continuationToken,
    pageSize,
  });

  return NextResponse.json(result);
}
