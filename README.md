# Ring Timelapse Automation

This repo automates pulling Ring clips for a time window, transcoding to 1080p with speedup, and uploading directly to Cloudflare R2. It runs on GitHub Actions (scheduled + manual dispatch) and can be triggered via a protected Vercel route.

## Environment / Secrets

Shared (GitHub Actions & Vercel):

- `RING_REFRESH_TOKEN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ALLOWED_EMAILS`
- `LOCATION`
- `LATITUDE`
- `LONGITUDE`

GitHub Actions (R2 upload):

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT` (e.g., `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
- `R2_ACCOUNT_ID`
- `R2_BUCKET`

Vercel dispatch route:

- `DISPATCH_SHARED_SECRET`
- `DISPATCH_ALLOWED_EMAILS` (comma-separated allowlist)
- `GITHUB_DISPATCH_TOKEN` (scoped to workflow dispatch)
- `GITHUB_REPO` (owner/repo)
- `GITHUB_WORKFLOW` (e.g., `ring-timelapse.yml`)

## R2 Key Schema

- Object key: `YYYY/<MonthName>/<filename>.mp4`
- Default filename: `ring-<clipType>-<YYYYMMDD>-<speed>x.mp4`
- Deterministic: same inputs -> same key unless `outKey` is provided.

## Workflow

File: `.github/workflows/ring-timelapse.yml`

- Triggers:
  - Schedule: `0 1 * * *` and `0 2 * * *` (covers 9pm America/New_York across DST)
  - `workflow_dispatch` inputs: `startIso`, `endIso`, `speed`, `outKey`, `cameraId`, `cameraName`, `clipType`
- Steps:
  - Install ffmpeg
  - `npm ci`
  - On schedule, set window to previous day in America/New_York
  - Run `npx tsx scripts/run-timelapse.ts ...`
- Timeout: 30 minutes

## Vercel Dispatch Route

`app/api/dispatch/route.ts`

- Headers:
  - `x-shared-secret` must match `DISPATCH_SHARED_SECRET`
  - `x-user-email` must be in `DISPATCH_ALLOWED_EMAILS`
- Body:

```json
{
  "startIso": "2026-01-08T02:00:00Z",
  "endIso": "2026-01-08T03:00:00Z",
  "speed": 30,
  "outKey": "optional/custom/key.mp4",
  "cameraId": "optional",
  "cameraName": "optional",
  "clipType": "daily|custom"
}
```

- Dispatches the GitHub workflow via REST API.

## CLI / Workflow Entrypoint

`scripts/run-timelapse.ts`

- Inputs (env or `--flag=value`): `START_ISO`, `END_ISO`, `SPEED`, `OUT_KEY`, `CAMERA_ID`, `CAMERA_NAME`, `CLIP_TYPE`
- Defaults when no times provided: previous day in America/New_York (00:00–00:00)
- Flow: create Ring download job → poll for `result_url` → ffmpeg (1080p, speedup) → stream upload to R2 (multipart)
- Output: final R2 key logged

## Dev Notes

- Ring client singleton lives in `src/lib/ring/client.ts` (`getRing()`).
- Ring download helpers live in `src/lib/ring/*` and shared types/constants in `src/types/infra` and `src/constants/constants.ts`.
- ffmpeg is required on the runner. On ubuntu-latest it is installed via `apt-get` in the workflow.
