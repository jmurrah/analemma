import "server-only";
import { auth } from "@/auth";
import { authEnv } from "@/config/env.server";
import { parseAllowlist } from "@/types/auth";
import type {
  FavoritesListResponse,
  ToggleFavoriteRequest,
  ToggleFavoriteResponse,
} from "@/types/api/favorites";

const allowedEmails = parseAllowlist(authEnv.ALLOWED_EMAILS);

const requireBearerToken = (): string => {
  const token = authEnv.FAVORITES_API_TOKEN;

  if (!token) {
    throw new Error("FAVORITES_API_TOKEN is not configured");
  }

  return token;
};

const buildWorkerUrl = (path: string, searchParams?: URLSearchParams): URL => {
  const base = authEnv.FAVORITES_WORKER_URL;

  if (!base) {
    throw new Error("FAVORITES_WORKER_URL is not configured");
  }

  const url = new URL(path, base);
  if (searchParams) {
    url.search = searchParams.toString();
  }

  return url;
};

const isAllowedUser = (email?: string | null): boolean => {
  if (!email) {
    return false;
  }

  return allowedEmails.includes(email.toLowerCase());
};

export const ensureAuthorizedUser = async (): Promise<string> => {
  const session = await auth();
  const email = session?.user?.email;

  if (!session || !email || !isAllowedUser(email)) {
    throw new Error("unauthorized");
  }

  return email.toLowerCase();
};

type WorkerError = {
  status: number;
  message: string;
};

const fetchFromWorker = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> => {
  const resp = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireBearerToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    let message = `worker error ${resp.status}`;

    try {
      const data = (await resp.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore parse failures
    }

    const err: WorkerError = { status: resp.status, message };
    throw err;
  }

  return resp.json() as Promise<T>;
};

export const fetchFavorites = async (
  params: { cursor?: string; limit?: number } = {},
): Promise<FavoritesListResponse> => {
  const search = new URLSearchParams();

  if (params.cursor) {
    search.set("cursor", params.cursor);
  }

  if (typeof params.limit === "number") {
    search.set("limit", String(params.limit));
  }

  const url = buildWorkerUrl("/favorites", search);
  return fetchFromWorker<FavoritesListResponse>(url);
};

export const toggleFavorite = async (
  body: ToggleFavoriteRequest,
): Promise<ToggleFavoriteResponse> => {
  const url = buildWorkerUrl("/favorites");

  return fetchFromWorker<ToggleFavoriteResponse>(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
};
