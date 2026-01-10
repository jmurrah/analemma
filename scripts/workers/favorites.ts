/**
 * Favorites Worker (Cloudflare Workers KV)
 *
 * KV binding required:
 *   - Binding variable name: FAVORITES
 *   - KV namespace selected: analemma
 *
 * Secret required:
 *   - FAVORITES_API_TOKEN
 *
 * Endpoints:
 *   GET  /favorites?cursor=&limit=
 *   GET  /favorites/status?key=<objectKey>
 *   POST /favorites        { key: string, favorite: boolean }
 */

const DEFAULT_LIMIT = 1000; // KV list max/default is 1000
const KEY_PREFIX = "fav:";

// Optional: tighten allowed object keys.
// If your videos are all under "videos/", keep this on. If not, set to "".
const ALLOWED_OBJECT_PREFIX = ""; // e.g. "videos/"

// Optional: restrict to video extensions (adjust to your needs)
const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".m4v"];

function json(
  data: unknown,
  init: ResponseInit = {},
  cors: Record<string, string> = {},
) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  // If you ever add CORS, apply here (not required for server-to-server calls)
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(JSON.stringify(data), { ...init, headers });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(msg: string) {
  return json({ error: msg }, { status: 400 });
}

function methodNotAllowed() {
  return json({ error: "Method Not Allowed" }, { status: 405 });
}

function normalizeLimit(raw: string | null) {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(DEFAULT_LIMIT, Math.floor(n));
}

function isAllowedKey(key: unknown) {
  if (typeof key !== "string") return false;
  if (!key.trim()) return false;
  if (key.length > 1024) return false; // keep sane (KV supports large keys, but don't)
  if (key.includes("\0")) return false;

  if (ALLOWED_OBJECT_PREFIX && !key.startsWith(ALLOWED_OBJECT_PREFIX))
    return false;

  const lower = key.toLowerCase();
  const okExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!okExt) return false;

  return true;
}

function requireBearerAuth(
  request: Request,
  env: { FAVORITES_API_TOKEN?: string },
) {
  const authHeader = request.headers.get("Authorization") || "";
  const expected = env.FAVORITES_API_TOKEN;
  if (!expected) return false;
  return authHeader === `Bearer ${expected}`;
}

export default {
  async fetch(
    request: Request,
    env: { FAVORITES?: KVNamespace; FAVORITES_API_TOKEN?: string },
  ) {
    if (!env.FAVORITES) {
      return json(
        {
          error:
            "Missing KV binding FAVORITES. Bind KV namespace 'analemma' as FAVORITES.",
        },
        { status: 500 },
      );
    }

    const url = new URL(request.url);
    const { pathname } = url;

    // Auth: require server-to-server bearer token
    if (!requireBearerAuth(request, env)) return unauthorized();

    // Routes
    if (pathname === "/favorites") {
      if (request.method === "GET") {
        const cursor = url.searchParams.get("cursor") || undefined;
        const limit = normalizeLimit(url.searchParams.get("limit"));

        const result = await env.FAVORITES.list({
          prefix: KEY_PREFIX,
          cursor,
          limit,
        });

        const keys = (result.keys || []).map((k) =>
          k.name.slice(KEY_PREFIX.length),
        );

        return json({
          keys,
          cursor: result.cursor || null,
          listComplete: !!result.list_complete,
        });
      }

      if (request.method === "POST") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON body");
        }

        const key = (body as { key?: unknown })?.key;
        const favorite = (body as { favorite?: unknown })?.favorite;

        if (!isAllowedKey(key)) {
          return badRequest("Invalid key (check prefix/extension)");
        }
        if (typeof favorite !== "boolean") {
          return badRequest("favorite must be boolean");
        }

        const kvKey = `${KEY_PREFIX}${key}`;
        const now = new Date().toISOString();

        if (favorite) {
          const payload = { v: 1, key, favorited: true, updatedAt: now };
          await env.FAVORITES.put(kvKey, JSON.stringify(payload));
        } else {
          await env.FAVORITES.delete(kvKey);
        }

        return json({ key, favorited: favorite, updatedAt: now });
      }

      return methodNotAllowed();
    }

    if (pathname === "/favorites/status") {
      if (request.method !== "GET") return methodNotAllowed();

      const key = url.searchParams.get("key");
      if (!isAllowedKey(key)) return badRequest("Invalid key");

      const kvKey = `${KEY_PREFIX}${key}`;
      const val = await env.FAVORITES.get(kvKey);

      return json({ key, favorited: val !== null });
    }

    return json({ error: "Not Found" }, { status: 404 });
  },
};
