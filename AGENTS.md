# AGENTS.md

You are an AI coding agent working in this repository. Your job is to produce **clean, modular, maintainable** Next.js code that matches the architecture rules below.

This repo values:

- **Single-responsibility files** (one “powerhouse” function/module per file)
- **Functional composition** over giant classes
- **Shared source-of-truth types** used consistently across files
- **Clear separation** of concerns: UI vs domain logic vs infrastructure (R2, auth, external APIs)

If you’re unsure, bias toward **smaller modules** and **explicit types**.

---

## Golden rules

1. **One module = one primary responsibility**

- A file should have _one_ “main” exported function/component (plus small helpers that only support it).
- If a file grows beyond ~150–200 lines, split it.

2. **No “god utils”**

- Do not create `utils.ts` with 40 unrelated helpers.
- Instead: create **topic-focused utility files** (e.g., `date/formatMonthName.ts`, `video/buildR2Key.ts`).

3. **Types are shared, central, and re-used**

- If multiple areas use the same shape, define it once in `src/types/...`.
- Avoid inline object shapes repeated across the codebase.

4. **Constants live in constants**

- No magic strings scattered through the app.
- Common constants go in `src/constants/...` or `src/config/...` (depending on semantics).

5. **Server/Client separation is explicit**

- Anything using secrets, tokens, filesystem, or privileged APIs must remain **server-only**.
- Components that use `useState/useEffect` must be explicitly client (`"use client"`).
- Never leak secrets via `NEXT_PUBLIC_*`.

6. **Functional, composable code**

- Prefer pure functions and composition.
- Side effects (network/file/db) should be isolated to `src/lib/...` or `src/services/...`.

7. **No silent failures**

- Validate inputs, throw typed errors, and surface meaningful logs.
- If a function can fail, it returns a `Result` type or throws a known error class.

---

## Preferred Next.js layout (App Router)

### Top-level structure (recommended)

```

src/
app/                      # Next.js App Router: routes, layouts, pages
(marketing)/            # Route groups when useful
api/                    # Route handlers for HTTP APIs (server-only)
layout.tsx
page.tsx

components/               # Shared UI components (mostly presentational)
ui/                     # shadcn primitives (do not edit unless necessary)
common/                 # app-wide reusable components
feature/                # feature-scoped components when shared across routes

features/                 # Feature modules (domain-first organization)
timelapse/
components/
hooks/
actions/              # server actions (optional)
services/             # high-level orchestration, feature-specific
utils/
types.ts              # feature-local types ONLY if not reused elsewhere

lib/                      # Infrastructure wrappers: external services, SDK clients
r2/
r2Client.ts
uploadObject.ts
multipartUpload.ts
github/
dispatchWorkflow.ts
ring/
ringClient.ts
downloadClip.ts

services/                 # Cross-feature services / orchestration
scheduler/
video/
transcode1080p.ts
speedUp.ts

types/                    # Global shared types (source of truth)
api/
domain/
infra/

constants/                # Global constants (no runtime secrets)
routes.ts
r2.ts
time.ts

config/                   # Runtime config readers/validators (env parsing, flags)
env.server.ts
env.client.ts

utils/                    # Small pure helpers grouped by topic
date/
string/
validation/

styles/
tests/

```

**Rule of thumb**

- `features/` = product/domain modules
- `lib/` = third-party integration details (SDKs, APIs)
- `services/` = orchestration across modules (often server-only)
- `types/` = shared shapes for the entire codebase
- `constants/` = shared constant values
- `config/` = reading/validating env + runtime settings

---

## File responsibilities (what goes where)

### `src/types/` (shared source of truth)

Use `src/types` for anything reused across multiple modules.

- `src/types/domain/*` — core business objects (e.g., TimelapseJob, ClipWindow)
- `src/types/api/*` — request/response shapes for API routes
- `src/types/infra/*` — external system shapes (R2 metadata, GitHub dispatch payload)

**Rules**

- Export types from the file they live in (avoid giant barrel exports unless strictly necessary).
- Prefer `type` aliases for unions/intersections and `interface` only where extension is needed.

### `src/constants/` (global constants)

Put stable constant values here:

- string literals used across files (route segments, header keys)
- numeric constants (timeouts, size limits)
- enums-as-const objects

**Rules**

- No secrets.
- Avoid constants that are only used in one file—keep those local.

### `src/config/` (env + runtime config)

All env parsing/validation lives here.

- `env.server.ts` reads secrets and validates required server env vars
- `env.client.ts` reads client-safe `NEXT_PUBLIC_*` vars

**Rules**

- Fail fast on missing required env vars.
- Never import `env.server.ts` into client code.

### `src/lib/` (SDK clients + thin wrappers)

This is where Cloudflare R2, GitHub, Ring, etc. integrations live.
Each file should do one thing well:

- create a client
- perform one operation (upload, list, dispatch)
- translate between SDK types and your internal types

**Rules**

- Keep SDK details out of features and UI.
- No UI imports here. Server-only by default.

### `src/features/` (feature modules)

Feature folders contain:

- feature UI components
- feature orchestration services
- feature-specific utilities and types (only if not reused)

**Rules**

- Feature code should call into `lib/*` for external interactions.
- Avoid feature-to-feature imports unless through `services/` or shared `types/`.

### `src/utils/` (pure helpers)

Only pure utilities:

- deterministic string/date helpers
- small formatting helpers
- validation helpers

**Rules**

- No network calls.
- No SDKs.
- No direct database/file access.

---

## Naming conventions

### Files & folders

- folders: `kebab-case`
- utility files: `camelCase.ts` for functions, `PascalCase.tsx` for React components (or keep components in `kebab-case` consistently—choose one and be consistent)
- avoid `index.ts` barrels unless the folder is very stable and small

### Exports

- Prefer **named exports** for utilities and services.
- Default exports only for Next.js pages/layouts and React components when appropriate.

### Types

- Domain types: `TimelapseJob`, `ClipWindow`, `R2ObjectKey`
- Request/response: `CreateJobRequest`, `CreateJobResponse`

---

## Patterns to follow

### “Core powerhouse function per file”

When you create a new capability, structure it like:

- `buildR2Key.ts` → exports `buildR2Key(...)`
- `uploadTimelapseToR2.ts` → exports `uploadTimelapseToR2(...)`
- `dispatchWorkflow.ts` → exports `dispatchWorkflow(...)`

If you find yourself adding unrelated helpers, split them immediately.

### Typed input validation

For all externally supplied input:

- API routes
- webhooks
- user forms
- workflow dispatch payloads

Use a schema validator (e.g., Zod) or explicit parsing functions.

- Validation logic belongs in `src/utils/validation/*` or close to the boundary (API route).

### Results vs Exceptions

- Use exceptions for truly exceptional failures and boundaries.
- Use a typed `Result` for expected failure modes if it improves flow control.

### Logging

- Log structured objects at boundaries:
  - before/after external calls
  - job start/end
  - error path with context
- Do not log secrets or tokens.

---

## Next.js specifics

### Server vs Client

- If it needs secrets, it is server-only.
- If it uses hooks (`useState`, `useEffect`), mark `"use client"` at the top.
- Shared components should avoid importing server-only modules.

### API Routes (Route Handlers)

- Define request/response types in `src/types/api/*`.
- Keep handlers thin: validate → call service → return response.
- Put orchestration in `src/services/*` or `src/features/<x>/services/*`.

### Server Actions (optional)

- Keep actions in `features/<x>/actions/*`.
- Actions call into `services/` and `lib/` modules.
- Avoid heavy logic directly inside the action file.

---

## Data model + shared types (must-have)

When adding a new “thing” (job, clip, upload):

1. Define canonical type in `src/types/domain/...`
2. Define API types in `src/types/api/...` if it crosses HTTP boundaries
3. Ensure every caller imports the shared type (no duplicate shapes)

If you introduce a timestamp, define whether it is:

- ISO string (`string`)
- epoch ms (`number`)
  and keep it consistent across types.

---

## Testing expectations

- Pure utilities: unit tests in `src/tests/unit/...`
- Service orchestration: integration-style tests (mock external libs)
- Avoid testing Next.js framework behavior; test your logic.

---

## PR / change checklist (agent self-review)

Before finishing:

- [ ] Did I create small, single-responsibility files?
- [ ] Are constants centralized (no repeated magic strings)?
- [ ] Are types defined once and reused everywhere?
- [ ] Are server-only imports isolated and not pulled into client components?
- [ ] Is input validation present at boundaries?
- [ ] Are logs safe (no secrets) and useful?
- [ ] Does the folder location match the responsibility (feature vs lib vs service vs utils)?

---

## “If you’re stuck” decision guide

- Is it shared across features? → `src/services/` or `src/types/` or `src/constants/`
- Is it an external SDK/API detail? → `src/lib/<provider>/`
- Is it business logic for one feature? → `src/features/<feature>/`
- Is it a pure helper? → `src/utils/<topic>/`
- Is it configuration/env parsing? → `src/config/`

Keep it modular. Keep it typed. Keep it obvious.
