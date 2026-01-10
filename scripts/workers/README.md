# Favorites Worker (Cloudflare Workers KV)

This Worker exposes a small REST API for managing favorited video keys in a KV namespace. It is intended for server-to-server calls from the Next.js app (bearer token required); no browser access is expected.

## Endpoints

- `GET /favorites?cursor=&limit=`
  - Auth: `Authorization: Bearer <FAVORITES_API_TOKEN>`
  - Lists keys with prefix `fav:` via `env.FAVORITES.list({ prefix, cursor, limit })`.
  - Response: `{ keys: string[], cursor: string | null, listComplete: boolean }`
- `POST /favorites`
  - Auth required. Body: `{ key: string, favorite: boolean }`
  - If `favorite` is `true`: `put("fav:<key>", JSON.stringify({ v: 1, key, favorited: true, updatedAt }))`
  - If `false`: `delete("fav:<key>")`
  - Response: `{ key, favorited: boolean, updatedAt }`
- `GET /favorites/status?key=<objectKey>`
  - Auth required. Response: `{ key, favorited: boolean }`

Errors: 401 for missing/invalid bearer token, 400 for bad input, 405 for unsupported methods, 404 for unknown paths.

## Auth

Every request must include `Authorization: Bearer <FAVORITES_API_TOKEN>`. The token is injected via `wrangler secret put FAVORITES_API_TOKEN`.

## KV Binding

Wrangler config (see `wrangler.toml`) binds `FAVORITES` to the KV namespace:

```toml
kv_namespaces = [
  { binding = "FAVORITES", id = "${KV_ID}" }
]
```

## Deployment

From the repo root:

```bash
npx wrangler deploy -c scripts/workers/wrangler.toml
```

Required env for deploy:

- `CLOUDFLARE_ACCOUNT_ID`
- `KV_ID` (namespace id for the favorites KV)
- Secret: `wrangler secret put FAVORITES_API_TOKEN`

## Notes on KV

KV is eventually consistent; recent writes may not be immediately visible across all PoPs. The frontend should use optimistic updates and tolerate brief stale reads. See Cloudflare docs: Workers `fetch` handler and KV list/put/get/delete behavior.
