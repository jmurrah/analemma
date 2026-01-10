import { NextResponse } from "next/server";
import {
  ensureAuthorizedUser,
  fetchFavorites,
} from "@/lib/favorites/favoritesApi";
import type { FavoritesApiResponse } from "@/types/api/favorites";

export const dynamic = "force-dynamic";

const ok = (body: unknown, status = 200) => NextResponse.json(body, { status });
const err = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    await ensureAuthorizedUser();
  } catch {
    return err("unauthorized", 401);
  }

  try {
    const favorites = await fetchFavorites({ cursor, limit });
    const response: FavoritesApiResponse = {
      favorites: favorites.keys,
      cursor: favorites.cursor,
      listComplete: favorites.listComplete,
    };
    return ok(response);
  } catch (error) {
    console.error("Failed to fetch favorites", { error });
    return err("server error", 500);
  }
}
