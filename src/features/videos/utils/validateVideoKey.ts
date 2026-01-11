import { R2_ALLOWED_VIDEO_PREFIXES, R2_VIDEO_EXTENSIONS } from "@/constants/r2";

const ALLOWED_PREFIXES = new Set(
  R2_ALLOWED_VIDEO_PREFIXES.map((prefix) => prefix.toLowerCase()),
);

const ALLOWED_EXTENSIONS = new Set(
  R2_VIDEO_EXTENSIONS.map((ext) => ext.toLowerCase()),
);

export const isValidVideoKey = (key: string): boolean => {
  if (!key || key.trim().length === 0) {
    return false;
  }

  const trimmed = key.trim();
  // Reject keys with path separators or traversal attempts
  // We only allow root-level filenames like "20260110_sunset.mp4"
  if (
    trimmed.startsWith("/") ||
    trimmed.includes("..") ||
    trimmed.includes("\\") ||
    trimmed.includes("/")
  ) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  if (ALLOWED_PREFIXES.size > 0) {
    let hasPrefix = false;

    for (const prefix of ALLOWED_PREFIXES) {
      if (lower.startsWith(prefix)) {
        hasPrefix = true;
        break;
      }
    }

    if (!hasPrefix) {
      return false;
    }
  }

  for (const ext of ALLOWED_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return true;
    }
  }

  return false;
};
