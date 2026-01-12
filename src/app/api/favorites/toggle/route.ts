import {
  ensureAuthorizedUser,
  toggleFavorite,
} from "@/lib/favorites/favoritesApi";
import { isValidVideoKey } from "@/features/videos/utils/validateVideoKey";
import type { ToggleFavoriteRequest } from "@/types/api/favorites";
import { ok, err } from "@/lib/api/responseHelpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureAuthorizedUser();
  } catch {
    return err("unauthorized", 401);
  }

  let body: ToggleFavoriteRequest | null = null;
  try {
    body = (await request.json()) as ToggleFavoriteRequest;
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return err("invalid body", 400);
  }

  if (!body || typeof body.key !== "string") {
    return err("invalid key", 400);
  }

  if (typeof body.favorite !== "boolean") {
    return err("invalid favorite flag", 400);
  }

  if (!isValidVideoKey(body.key)) {
    return err("invalid key", 400);
  }

  try {
    const result = await toggleFavorite(body);
    return ok(result);
  } catch (error) {
    console.error("Failed to toggle favorite", { error });
    return err("server error", 500);
  }
}
