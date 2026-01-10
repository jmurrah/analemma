const OVERLAY_STORAGE_KEY = "favorites:overlay:v1";
const OVERLAY_TTL_MS = 90_000; // allow for KV propagation (~60s) with buffer

type OverlayEntry = {
  desired: boolean;
  updatedAt: number;
  status: "pending" | "confirmed";
  attempts: number;
};

const isValidOverlayEntry = (value: unknown): value is OverlayEntry => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<OverlayEntry>;
  return (
    typeof entry.desired === "boolean" &&
    typeof entry.updatedAt === "number" &&
    typeof entry.status === "string" &&
    typeof entry.attempts === "number"
  );
};

const pruneOverlay = (
  entries: Map<string, OverlayEntry>,
  now = Date.now(),
): Map<string, OverlayEntry> => {
  const next = new Map<string, OverlayEntry>();
  entries.forEach((entry, key) => {
    if (now - entry.updatedAt <= OVERLAY_TTL_MS) {
      next.set(key, entry);
    }
  });
  return next;
};

const writeOverlay = (entries: Map<string, OverlayEntry>) => {
  if (typeof window === "undefined") return entries;
  const pruned = pruneOverlay(entries);
  try {
    const obj: Record<string, OverlayEntry> = {};
    pruned.forEach((entry, key) => {
      obj[key] = entry;
    });
    window.localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore storage errors (quota, unavailability)
  }
  return pruned;
};

export const readOverlay = (): Map<string, OverlayEntry> => {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map = new Map<string, OverlayEntry>();
    if (parsed && typeof parsed === "object") {
      for (const [key, value] of Object.entries(parsed)) {
        if (isValidOverlayEntry(value)) {
          map.set(key, value);
        }
      }
    }
    const pruned = pruneOverlay(map);
    writeOverlay(pruned);
    return pruned;
  } catch {
    return new Map();
  }
};

export const updateOverlay = (
  current: Map<string, OverlayEntry>,
  mutator: (draft: Map<string, OverlayEntry>) => void,
): Map<string, OverlayEntry> => {
  const draft = new Map(current);
  mutator(draft);
  return writeOverlay(draft);
};

export const overlayConstants = {
  storageKey: OVERLAY_STORAGE_KEY,
  ttlMs: OVERLAY_TTL_MS,
};

export type { OverlayEntry };
